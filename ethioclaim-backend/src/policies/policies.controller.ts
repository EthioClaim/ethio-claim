import { Controller, Post, Get, Param, Body, UseGuards } from "@nestjs/common";
import { PoliciesService } from "./policies.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { IsString, MinLength } from "class-validator";

class VerifyPolicyDto {
  @IsString()
  @MinLength(1)
  policyNumber: string;
}

@Controller("policies")
@UseGuards(JwtAuthGuard, RolesGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) { }

  @Post("verify")
  verify(@Body() dto: VerifyPolicyDto) {
    return this.policiesService.verify(dto.policyNumber);
  }

  @Get(":policyId")
  findOne(@Param("policyId") policyId: string) {
    return this.policiesService.findById(policyId);
  }
}
