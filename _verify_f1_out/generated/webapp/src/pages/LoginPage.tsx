import React from "react";

export function LoginPage() {
  return (
    <section>
      <h2>Login</h2>
      <form>
        <label>password<input name="password" /></label>
        <label>username<input name="username" /></label>
        <button type="submit">Sign In</button>
      </form>
    </section>
  );
}
