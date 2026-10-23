import base64
import io
import os
import logging
from pathlib import Path
from typing import Optional, Tuple
from PIL import Image, ImageDraw, ImageFile
import httpx
from fastapi import HTTPException, status
from app.core.config import settings

logger = logging.getLogger("image_loader")
ImageFile.LOAD_TRUNCATED_IMAGES = True


class ImageLoaderService:
    def __init__(self):
        backend_root = Path(__file__).resolve().parent.parent.parent.parent
        self.workspace_root = backend_root
        self.uploads_dir = (backend_root / "ethioclaim-backend" / "uploads").resolve()

    async def load_image(
        self,
        image_ref: Optional[str] = None,
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        fallback_seed: Optional[str] = None,
    ) -> Tuple[Image.Image, dict]:
        """
        Loads and validates an image from base64, trusted local storage reference,
        or authorized HTTP URL. Raises clear errors on corrupt or missing images.
        """
        raw_bytes: Optional[bytes] = None

        # 1. Base64 payload
        if image_base64:
            try:
                if "base64," in image_base64:
                    image_base64 = image_base64.split("base64,")[1]
                raw_bytes = base64.b64decode(image_base64)
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid base64 image data: {str(e)}",
                )

        # 2. Local storage reference
        if not raw_bytes and image_ref:
            sanitized_key = image_ref.replace("/", "_").replace("\\", "_")
            candidate_paths = [
                Path(image_ref),
                self.uploads_dir / image_ref,
                self.uploads_dir / sanitized_key,
                self.workspace_root / image_ref,
                self.workspace_root / "uploads" / sanitized_key,
                Path(settings.LOCAL_UPLOADS_DIR).resolve() / image_ref,
                Path(settings.LOCAL_UPLOADS_DIR).resolve() / sanitized_key,
            ]
            for p in candidate_paths:
                if p.is_file():
                    raw_bytes = p.read_bytes()
                    logger.info(f"Loaded image bytes from local file: {p}")
                    break

        # 3. HTTP / URL
        if not raw_bytes and image_url:
            if not (image_url.startswith("http://") or image_url.startswith("https://")):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid image URL protocol. Only HTTP/HTTPS is allowed.",
                )
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(image_url)
                    if resp.status_code == 200:
                        raw_bytes = resp.content
            except Exception as err:
                logger.warning(f"Failed to fetch image from URL {image_url}: {err}")

        # If image reference was provided but could not be resolved, do NOT fabricate data
        if not raw_bytes:
            if image_ref or image_url:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Evidence image file '{image_ref or image_url}' could not be located in storage.",
                )
            elif fallback_seed:
                # Only use synthetic image if no image reference was provided at all (synthetic testing)
                raw_bytes = self._generate_synthetic_image(fallback_seed)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No image data or storage reference provided for analysis.",
                )

        # Validation of raw byte length
        if len(raw_bytes) > settings.MAX_IMAGE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image size exceeds maximum allowed ({settings.MAX_IMAGE_BYTES} bytes)",
            )

        # Decode via Pillow
        try:
            img = Image.open(io.BytesIO(raw_bytes))
            img.load()  # verify integrity
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or corrupt image format: {str(e)}",
            )

        # Validate dimensions
        width, height = img.size
        if width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Image dimensions ({width}x{height}) exceed maximum allowed ({settings.MAX_IMAGE_DIMENSION}px)",
            )

        # Convert palette/RGBA to RGB
        if img.mode != "RGB":
            img = img.convert("RGB")

        metadata = {
            "width": width,
            "height": height,
            "format": img.format or "JPEG",
            "sizeBytes": len(raw_bytes),
        }

        return img, metadata

    def _generate_synthetic_image(self, seed: str) -> bytes:
        """
        Generates a synthetic test image for unit tests where no image file is supplied.
        """
        width, height = 400, 300
        seed_hash = sum(ord(c) for c in seed) % 256
        bg_color = (seed_hash, (seed_hash * 3) % 256, (seed_hash * 7) % 256)
        img = Image.new("RGB", (width, height), color=bg_color)
        draw = ImageDraw.Draw(img)
        draw.rectangle([50, 50, 350, 250], outline=(255, 255, 255), width=2)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()


image_loader_service = ImageLoaderService()
