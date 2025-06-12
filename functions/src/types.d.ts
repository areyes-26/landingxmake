declare module 'firebase-functions' {
  export interface Request {
    method: string;
    query: { [key: string]: string | string[] };
    body: any;
    headers: { [key: string]: string | string[] };
    rawBody: Buffer;
  }

  export interface Response {
    status(code: number): Response;
    send(body: any): void;
    json(body: any): void;
  }

  export namespace https {
    function onRequest(handler: (req: Request, res: Response) => void | Promise<void>): Function;
  }

  export const config: () => {
    facebook?: { app_secret?: string };
    heygen?: { api_key?: string };
    instagram: {
      client_id: string; // 👈 AGREGAR ESTA LÍNEA
      client_secret: string;
      verify_token: string;
      app_secret: string;
    };
    google?: { script_url?: string };
    openai?: { api_key?: string };
  };
}
