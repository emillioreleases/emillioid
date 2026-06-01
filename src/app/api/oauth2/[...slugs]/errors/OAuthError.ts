export class OAuthError extends Error {
  status = 400;

  constructor(
    public code: string,
    public message: string,
    public state: string,
  ) {
    super(message);
  }

  toResponse() {
    return Response.json(
      {
        error: this.code,
        error_description: this.message,
        state: this.state,
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}
