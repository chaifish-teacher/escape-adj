import { test, expect } from "@playwright/test";
import { vocabulary, questions, puzzle } from "../../src/data";
test("login, learning, source puzzles, challenge completion", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /ESCAPE FROM/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "START ADVENTURE" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Enter your name",
  );
  await page.getByLabel("What should we call you?").fill("  Test Hero  ");
  await page.getByRole("button", { name: "START ADVENTURE" }).click();
  await page
    .getByRole("button", { name: "Vocabulary learning 單字學習" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Collect your words/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Next 下一個/ }).click();
  await page.getByRole("button", { name: /I'm ready/ }).click();
  await expect(
    page.getByRole("heading", { name: /Know your words/ }),
  ).toBeVisible();
  // Exercise the bounded incorrect-answer flow without using answer labels embedded in images.
  for (let i = 0; i < 8; i++) {
    await page.locator(".choice").first().click();
    if (
      !(await page
        .locator(".primary")
        .filter({ hasText: /Next 下一題|Finish 完成/ })
        .count())
    ) {
      await page.locator(".choice").first().click();
    }
    await page
      .getByRole("button", { name: i === 7 ? "Finish 完成" : "Next 下一題" })
      .click();
  }
  await page
    .getByRole("button", { name: "Listening 聽力練習", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Listen closely/ }),
  ).toBeVisible();
  for (let i = 0; i < 6; i++) {
    await page.locator(".choice").first().click();
    if (
      !(await page
        .locator(".primary")
        .filter({ hasText: /Next 下一題|Finish 完成/ })
        .count())
    )
      await page.locator(".choice").first().click();
    await page
      .getByRole("button", { name: i === 5 ? "Finish 完成" : "Next 下一題" })
      .click();
  }
  await page
    .getByRole("button", { name: "Spelling 拼字練習", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Spell your magic/ }),
  ).toBeVisible();
  for (let i = 0; i < 6; i++) {
    const src = await page.locator(".quiz-target").getAttribute("src");
    const word = vocabulary.find((w) => w.image === src)!.word;
    for (const letter of word.replaceAll(" ", "")) {
      await page
        .locator(".letter-bank button:not([disabled])")
        .filter({ hasText: new RegExp(`^${letter.toUpperCase()}$`) })
        .first()
        .click();
    }
    await page.getByRole("button", { name: /Check 檢查/ }).click();
    await page
      .getByRole("button", { name: i === 5 ? "Finish 完成" : "Next 下一題" })
      .click();
  }
  await page.getByRole("button", { name: /CHALLENGE THE TOWER/ }).click();
  await page.getByRole("button", { name: /ENTER THE TOWER/ }).click();
  await page.locator(".character-grid button").first().click();
  await expect(page.locator(".escape-hud")).toContainText("× 1");
  await expect(page.locator(".escape-hud")).toContainText("× 1");
  await page.locator(".character-grid button").nth(2).click();
  await page.getByRole("button", { name: /Collect digit/ }).click();
  await page
    .locator(".branch-options button")
    .filter({ hasText: "YES" })
    .click();
  await page
    .locator(".branch-options button")
    .filter({ hasText: "NO" })
    .click();
  await page
    .locator(".branch-options button")
    .filter({ hasText: "BLUE" })
    .click();
  await page.getByRole("button", { name: /Collect digit/ }).click();
  for (const p of puzzle) {
    for (const letter of p.word.replaceAll(" ", ""))
      await page
        .locator(".letter-bank button:not([disabled])")
        .filter({ hasText: new RegExp(`^${letter.toUpperCase()}$`) })
        .first()
        .click();
    await page.getByRole("button", { name: /Check 檢查/ }).click();
  }
  await page.getByRole("button", { name: "1 · English", exact: true }).click();
  await page.getByRole("button", { name: /Collect digit/ }).click();
  for (const [task, people] of [
    [0, [3]],
    [1, [0]],
    [2, [1, 3]],
    [3, [1]],
  ] as [number, number[]][]) {
    await page.locator(".count-tabs button").nth(task).click();
    for (const person of people)
      await page
        .getByRole("button", {
          name: `Select person ${person + 1}`,
          exact: true,
        })
        .click();
  }
  await page.getByRole("button", { name: "2 · 1121", exact: true }).click();
  await page.getByRole("button", { name: /Collect digit/ }).click();
  for (let i = 0; i < 4; i++)
    await page.getByLabel(`Code digit ${i + 1}`).fill("3412"[i]);
  await page.getByRole("button", { name: /UNLOCK THE DOOR/ }).click();
  await expect(
    page.getByRole("heading", { name: /YOU ESCAPED/ }),
  ).toBeVisible();
  await expect(page.locator(".result")).toContainText(
    "冒險完成！隨時可以再挑戰。",
  );
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-result.png`,
    fullPage: true,
  });
});
test("landing fits small screen and all source media load", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(
    await page.evaluate(() =>
      Array.from(document.images).every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-landing.png`,
    fullPage: true,
  });
});

test("audio unavailable remains playable and music can be toggled", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Turn music on" }).click();
  await expect(
    page.getByRole("button", { name: "Turn music off" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Turn music off" }).click();
  await page.getByLabel("What should we call you?").fill("Audio Hero");
  await page.getByRole("button", { name: "START ADVENTURE" }).click();
  await page
    .getByRole("button", { name: "Vocabulary learning 單字學習" })
    .click();
  await page.getByRole("button", { name: "Listen to word 單字發音" }).click();
  await expect(page.getByText(/Audio unavailable. Read:/)).toHaveCount(0);
  await page.getByRole("button", { name: /I'm ready/ }).click();
  await expect(
    page.getByRole("heading", { name: /Know your words/ }),
  ).toBeVisible();
});
