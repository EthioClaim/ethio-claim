import math
import logging
from pathlib import Path
from typing import List, Optional
from PIL import Image
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
from safetensors.torch import load_file
from app.core.config import settings

logger = logging.getLogger("embedding_service")


class Dinov2Layer(nn.Module):
    def __init__(self, hidden_size=384, num_heads=6, mlp_dim=1536):
        super().__init__()
        self.norm1 = nn.LayerNorm(hidden_size, eps=1e-6)
        self.num_heads = num_heads
        self.head_dim = hidden_size // num_heads
        self.q = nn.Linear(hidden_size, hidden_size)
        self.k = nn.Linear(hidden_size, hidden_size)
        self.v = nn.Linear(hidden_size, hidden_size)
        self.proj = nn.Linear(hidden_size, hidden_size)
        self.scale = 1.0 / math.sqrt(self.head_dim)
        self.ls1 = nn.Parameter(torch.ones(hidden_size))

        self.norm2 = nn.LayerNorm(hidden_size, eps=1e-6)
        self.fc1 = nn.Linear(hidden_size, mlp_dim)
        self.fc2 = nn.Linear(mlp_dim, hidden_size)
        self.ls2 = nn.Parameter(torch.ones(hidden_size))

    def forward(self, x):
        B, N, C = x.shape
        x_norm = self.norm1(x)

        q = self.q(x_norm).reshape(B, N, self.num_heads, self.head_dim).permute(0, 2, 1, 3)
        k = self.k(x_norm).reshape(B, N, self.num_heads, self.head_dim).permute(0, 2, 1, 3)
        v = self.v(x_norm).reshape(B, N, self.num_heads, self.head_dim).permute(0, 2, 1, 3)

        attn = (q @ k.transpose(-2, -1)) * self.scale
        attn = attn.softmax(dim=-1)
        out = (attn @ v).transpose(1, 2).reshape(B, N, C)
        out = self.proj(out)
        x = x + self.ls1 * out

        x_norm2 = self.norm2(x)
        mlp_out = self.fc2(F.gelu(self.fc1(x_norm2)))
        x = x + self.ls2 * mlp_out
        return x


class Dinov2VisionTransformer(nn.Module):
    def __init__(self, hidden_size=384, num_heads=6, num_layers=12, mlp_dim=1536, patch_size=14):
        super().__init__()
        self.patch_size = patch_size
        self.proj = nn.Conv2d(3, hidden_size, kernel_size=patch_size, stride=patch_size)
        self.cls_token = nn.Parameter(torch.zeros(1, 1, hidden_size))
        self.position_embeddings = nn.Parameter(torch.zeros(1, 1370, hidden_size))
        self.layers = nn.ModuleList([
            Dinov2Layer(hidden_size, num_heads, mlp_dim) for _ in range(num_layers)
        ])
        self.norm = nn.LayerNorm(hidden_size, eps=1e-6)

    def forward(self, x):
        B = x.shape[0]
        patches = self.proj(x)
        patches = patches.flatten(2).transpose(1, 2)

        cls_tokens = self.cls_token.expand(B, -1, -1)
        tokens = torch.cat([cls_tokens, patches], dim=1)
        tokens = tokens + self.position_embeddings

        for layer in self.layers:
            tokens = layer(tokens)

        tokens = self.norm(tokens)
        cls_out = tokens[:, 0]
        cls_out = F.normalize(cls_out, p=2, dim=-1)
        return cls_out


class EmbeddingService:
    def __init__(self):
        self.dimension = settings.EMBEDDING_DIMENSION
        self.model_name = settings.EMBEDDING_MODEL_NAME
        self.version = settings.EMBEDDING_MODEL_VERSION
        self.model = None

        if not settings.USE_MOCK_EMBEDDING_MODEL:
            self._load_dinov2_model()

        self.transform = T.Compose([
            T.Resize((518, 518)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

    def _load_dinov2_model(self):
        backend_root = Path(__file__).resolve().parent.parent.parent
        weights_path = backend_root / "models" / "dinov2_small" / "model.safetensors"

        if not weights_path.exists():
            logger.warning(f"DINOv2 weights not found at {weights_path}; will use zero-mean color-spatial encoder.")
            return

        try:
            model = Dinov2VisionTransformer()
            tensors = load_file(str(weights_path))

            with torch.no_grad():
                model.cls_token.copy_(tensors["embeddings.cls_token"])
                model.position_embeddings.copy_(tensors["embeddings.position_embeddings"])
                model.proj.weight.copy_(tensors["embeddings.patch_embeddings.projection.weight"])
                model.proj.bias.copy_(tensors["embeddings.patch_embeddings.projection.bias"])

                for i, layer in enumerate(model.layers):
                    prefix = f"encoder.layer.{i}."
                    layer.norm1.weight.copy_(tensors[f"{prefix}norm1.weight"])
                    layer.norm1.bias.copy_(tensors[f"{prefix}norm1.bias"])
                    layer.q.weight.copy_(tensors[f"{prefix}attention.attention.query.weight"])
                    layer.q.bias.copy_(tensors[f"{prefix}attention.attention.query.bias"])
                    layer.k.weight.copy_(tensors[f"{prefix}attention.attention.key.weight"])
                    layer.k.bias.copy_(tensors[f"{prefix}attention.attention.key.bias"])
                    layer.v.weight.copy_(tensors[f"{prefix}attention.attention.value.weight"])
                    layer.v.bias.copy_(tensors[f"{prefix}attention.attention.value.bias"])
                    layer.proj.weight.copy_(tensors[f"{prefix}attention.output.dense.weight"])
                    layer.proj.bias.copy_(tensors[f"{prefix}attention.output.dense.bias"])
                    layer.ls1.copy_(tensors[f"{prefix}layer_scale1.lambda1"])

                    layer.norm2.weight.copy_(tensors[f"{prefix}norm2.weight"])
                    layer.norm2.bias.copy_(tensors[f"{prefix}norm2.bias"])
                    layer.fc1.weight.copy_(tensors[f"{prefix}mlp.fc1.weight"])
                    layer.fc1.bias.copy_(tensors[f"{prefix}mlp.fc1.bias"])
                    layer.fc2.weight.copy_(tensors[f"{prefix}mlp.fc2.weight"])
                    layer.fc2.bias.copy_(tensors[f"{prefix}mlp.fc2.bias"])
                    layer.ls2.copy_(tensors[f"{prefix}layer_scale2.lambda1"])

                model.norm.weight.copy_(tensors["layernorm.weight"])
                model.norm.bias.copy_(tensors["layernorm.bias"])

            model.eval()
            self.model = model
            logger.info("Successfully loaded real DINOv2 vision embedding model (384 dimensions).")
        except Exception as e:
            logger.error(f"Failed to load DINOv2 model: {e}", exc_info=True)
            self.model = None

    def generate_embedding(
        self,
        image: Image.Image,
        sha256: Optional[str] = None,
        phash: Optional[str] = None,
    ) -> List[float]:
        """
        Generates a 384-dim L2-normalized embedding vector.
        Uses real DINOv2 neural network when available; falls back to a zero-mean
        spatial/color decomposition if weights are not loaded.
        """
        if self.model is not None:
            try:
                rgb_img = image.convert("RGB")
                tensor = self.transform(rgb_img).unsqueeze(0)
                with torch.no_grad():
                    emb = self.model(tensor)
                vector = emb[0].cpu().tolist()
                return vector
            except Exception as e:
                logger.error(f"DINOv2 inference error: {e}", exc_info=True)

        # Fallback: Zero-mean normalized color-spatial embedding
        # Downsample to 16x8 for 3 color channels = 384 dimensions
        rgb = image.convert("RGB").resize((16, 8))
        r_vals = [p[0] / 255.0 for p in rgb.getdata()]
        g_vals = [p[1] / 255.0 for p in rgb.getdata()]
        b_vals = [p[2] / 255.0 for p in rgb.getdata()]
        raw = r_vals + g_vals + b_vals

        # Mean-center to avoid the all-positive cosine similarity collapse
        mean_val = sum(raw) / len(raw) if raw else 0.0
        centered = [x - mean_val for x in raw]

        # L2-normalize
        norm = math.sqrt(sum(x * x for x in centered))
        if norm > 1e-9:
            vector = [x / norm for x in centered]
        else:
            vector = [1.0 / math.sqrt(self.dimension)] * self.dimension

        return vector

    def cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        """
        Computes cosine similarity between two unit vectors.
        """
        if len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        return max(0.0, min(1.0, float(dot)))


embedding_service = EmbeddingService()
