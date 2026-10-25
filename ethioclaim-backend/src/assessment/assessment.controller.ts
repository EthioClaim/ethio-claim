import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from "@nestjs/common";
import { AssessmentService } from "./assessment.service";
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateDecisionDto,
} from "./dto/assessment.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard, Roles } from "../auth/roles.guard";

@Controller("claims/:claimId")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) { }

  @Post("assessment")
  @Roles("EXAMINER", "ADMIN")
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param("claimId") claimId: string,
    @Body() dto: CreateAssessmentDto,
    @Req() req: any,
  ) {
    return this.assessmentService.create(
      claimId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get("assessment")
  @Roles("EXAMINER", "ADMIN", "INTAKE_USER")
  findByClaim(@Param("claimId") claimId: string, @Req() req: any) {
    return this.assessmentService.findByClaimId(
      claimId,
      req.user.id,
      req.user.role,
    );
  }

  @Patch("assessment")
  @Roles("EXAMINER", "ADMIN")
  update(
    @Param("claimId") claimId: string,
    @Body() dto: UpdateAssessmentDto,
    @Req() req: any,
  ) {
    return this.assessmentService.update(
      claimId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Post("decision")
  @Roles("EXAMINER", "ADMIN")
  @HttpCode(HttpStatus.CREATED)
  recordDecision(
    @Param("claimId") claimId: string,
    @Body() dto: CreateDecisionDto,
    @Req() req: any,
  ) {
    return this.assessmentService.recordDecision(
      claimId,
      dto,
      req.user.id,
      req.user.role,
    );
  }
}
