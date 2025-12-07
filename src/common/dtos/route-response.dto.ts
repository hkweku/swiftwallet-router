import { RouteDecision } from '../../routing/interfaces/route-decision.interface';

export interface RouteResponseDto {
  transferId: string;
  status: string;
  route: RouteDecision;
}
