export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export type CurrentUser = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthResponse = {
  user: CurrentUser;
};
