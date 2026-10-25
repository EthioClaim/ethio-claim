import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("dashboard")
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get("summary")
  getSummary(
    @Req() req: any,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.dashboardService.getSummary(
      req.user.id,
      req.user.role,
      from,
      to,
    );
  }
}
