
export function generateUser() {
  const id = Math.random().toString(36).substring(7);
  return {
    name: `user_${id}`,
    email: `user_${id}@test.com`,
    password: `pass_${id}`,
  };
}

export function getLoginPayload(user) {
  return JSON.stringify({
    email: user.email,
    password: user.password,
  });
}
