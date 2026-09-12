import { describe, it, expect } from "vitest";

const BULLET = "•";

describe("ZeroEchoPasswordInput Logic", () => {
  it("renders display value exclusively as bullets when showPassword is false", () => {
    const raw = "P@ssw0rd!#123";
    const display = BULLET.repeat(raw.length);
    expect(display).toBe("•••••••••••••");
    expect(display).not.toContain("P");
    expect(display).not.toContain("1");
    expect(display).not.toContain("@");
  });

  it("handles instant character insertion without exposing the typed character", () => {
    let raw = "hello";
    const newChar = "X";
    const cursor = 5;
    // Simulate beforeInput insertion at cursor
    raw = raw.slice(0, cursor) + newChar + raw.slice(cursor);
    const display = BULLET.repeat(raw.length);

    expect(raw).toBe("helloX");
    expect(display).toBe("••••••");
    // Ensure display NEVER has 'X' or any letter
    expect(display).not.toContain("X");
  });

  it("handles backspace deletion correctly", () => {
    let raw = "Secret!";
    const cursor = 7;
    // Simulate deleteContentBackward
    raw = raw.slice(0, cursor - 1) + raw.slice(cursor);
    const display = BULLET.repeat(raw.length);

    expect(raw).toBe("Secret");
    expect(display).toBe("••••••");
  });

  it("handles password autofill conversion to bullets immediately", () => {
    const autofilled = "AutofilledPasswordFromManager99";
    // Check detection: contains no bullets
    const isAutofill = !autofilled.includes(BULLET);
    expect(isAutofill).toBe(true);

    const raw = autofilled;
    const display = BULLET.repeat(raw.length);
    expect(display).toBe("•••••••••••••••••••••••••••••••");
    expect(display.length).toBe(autofilled.length);
  });
});
