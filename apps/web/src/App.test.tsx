import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import * as authService from "./auth/authService";

vi.mock("./auth/authService", () => ({
  isGoogleSignInAvailable: vi.fn(),
  subscribeToAuth: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInDev: vi.fn(),
  signOutUser: vi.fn(),
}));

const USER = {
  id: "u1",
  name: "Taylor Reed",
  email: "taylor@example.com",
  picture: null,
};

function authAs(user: typeof USER | null) {
  vi.mocked(authService.subscribeToAuth).mockImplementation((cb) => {
    cb(user);
    return () => {};
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(authService.isGoogleSignInAvailable).mockReturnValue(false);
  vi.mocked(authService.signOutUser).mockResolvedValue(undefined);
  authAs(USER);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("authentication", () => {
  it("redirects signed-out visitors to the login page with the dev form", async () => {
    authAs(null);
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("offers Google sign-in when Firebase is configured", async () => {
    authAs(null);
    vi.mocked(authService.isGoogleSignInAvailable).mockReturnValue(true);
    vi.mocked(authService.signInWithGoogle).mockResolvedValue(USER);
    renderAt("/login");

    fireEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    expect(
      await screen.findByRole("heading", { name: "Welcome, Taylor Reed" }),
    ).toBeInTheDocument();
    expect(authService.signInWithGoogle).toHaveBeenCalled();
  });

  it("signs in through the dev form and shows the user's name and email", async () => {
    authAs(null);
    vi.mocked(authService.signInDev).mockResolvedValue(USER);
    renderAt("/login");

    fireEvent.change(await screen.findByLabelText("Your name"), {
      target: { value: "Taylor Reed" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "taylor@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Welcome, Taylor Reed" }),
    ).toBeInTheDocument();
    expect(authService.signInDev).toHaveBeenCalledWith("Taylor Reed", "taylor@example.com");
    expect(screen.getAllByText("taylor@example.com").length).toBeGreaterThanOrEqual(1);
  });

  it("signs the user out and returns to the login page", async () => {
    renderAt("/");
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(authService.signOutUser).toHaveBeenCalled();
  });
});

describe("post-login home", () => {
  it("greets the user and offers AMC 8, AMC 10, and AMC 12", async () => {
    renderAt("/");
    expect(
      await screen.findByRole("heading", { name: "Welcome, Taylor Reed" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Signed in as taylor@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take an AMC 8 assessment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take an AMC 10 assessment" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Take an AMC 12 assessment" })).toBeInTheDocument();
  });
});

describe("assessment hub (bundled question bank)", () => {
  it("lists real assessments from the bundled bank with start buttons enabled", async () => {
    renderAt("/assessment");
    expect(await screen.findByText("AMC 8 Mock Exam #1")).toBeInTheDocument();
    expect(screen.getByText("Geometry Quiz")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start AMC 8 Mock Exam #1/ })).toBeEnabled();
  });

  it("filters to one competition via the exam query param", async () => {
    renderAt("/assessment?exam=amc8");
    expect(await screen.findByText("AMC 8 Mock Exam #1")).toBeInTheDocument();
    expect(screen.getByText(/Showing AMC 8 assessments/)).toBeInTheDocument();
    expect(screen.queryByText("AMC 10 Mock Exam #1")).not.toBeInTheDocument();
  });
});

describe("roadmap", () => {
  it("renders the roadmap page for a signed-in user", async () => {
    renderAt("/roadmap");
    expect(await screen.findByRole("heading", { name: "Roadmap" })).toBeInTheDocument();
  });
});
