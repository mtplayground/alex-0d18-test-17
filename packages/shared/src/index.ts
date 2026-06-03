export type HealthStatus = "ok";

export interface HealthResponse {
  status: HealthStatus;
  service: "myClawTeam API";
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
