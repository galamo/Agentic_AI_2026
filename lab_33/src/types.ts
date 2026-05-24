export type Gender = 'male' | 'female' | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: Gender;
}

export type CreateUserInput = {
  name: string;
  email: string;
  gender: Gender;
};
