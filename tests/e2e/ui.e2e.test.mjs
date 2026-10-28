/**
 * Browser tests (Playwright/Chromium) for the customer booking flow and the admin panel.
 * Run via scripts/test/run-e2e.sh.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import pg from "pg";

const APP = process.env.APP_URL || "http://localhost:3100";
const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL || "postgres://postgres@127.0.0.1:54329/autoshop" });
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try {
    return require("playwright");
  } catch {
    return require(`${execSync("npm root -g").toString().trim()}/playwright`);
  }
})();

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await pool.end();
});

async function phone(locale = "ru-RU") {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, locale });
  await ctx.addCookies([{ name: "cookie_consent", value: "necessary", url: APP }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return { page, errors, ctx };
}

test("language detection, switcher and no horizontal scroll at 375px", async () => {
  const { page, ctx } = await phone("ru-RU");
  await page.goto(APP);
  assert.match(page.url(), /\/ru$/);
  for (const path of ["/ru", "/ru/services", "/ru/about", "/ru/contact", "/ru/booking", "/ru/privacy"]) {
    await page.goto(APP + path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.equal(overflow, 0, `${path} has no horizontal scroll`);
    assert.equal(await page.locator("h1").count(), 1, `${path} has exactly one h1`);
  }
  await page.goto(`${APP}/ru/services`);
  await page.click('a[hreflang="en"]');
  await page.waitForURL(/\/en\/services$/);
  await page.goto(`${APP}/ru/does-not-exist`);
  assert.equal(await page.locator("h1").textContent(), "Страница не найдена");
  await ctx.close();
});

test("customer books through the 4-step wizard and cancels from the manage page", async () => {
  const { page, errors, ctx } = await phone();
  await page.goto(`${APP}/ru/services`);
  await page.click('a[href="/ru/booking?service=suspension"]');
  await page.waitForSelector("text=Что нужно сделать?");
  assert.equal(await page.locator("input[type=checkbox]:checked").count(), 1, "service preselected");
  await page.click("button:has-text('Далее')");
  await page.locator('button[aria-label*="свободно:"]').first().click();
  await page.locator("fieldset button").first().click();
  await page.click("button:has-text('Далее')");
  await page.click("button:has-text('Далее')");
  assert.ok((await page.locator(".field-error").count()) >= 2, "car validation shown");
  await page.fill("#carMake", "Škoda");
  await page.fill("#carModel", "Octavia");
  await page.fill("#comment", "Стук в подвеске на кочках");
  await page.click("button:has-text('Далее')");
  await page.fill("#name", "Анна Смирнова");
  await page.fill("#phone", "+372 5123 4567");
  await page.check("input[type=checkbox]");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Вы записаны!");
  const number = Number((await page.locator("text=/Номер записи #\\d+/").textContent()).match(/\d+/)[0]);
  const [row] = (await pool.query("select status, comment, car_make from bookings where number = $1", [number])).rows;
  assert.deepEqual(row, { status: "new", comment: "Стук в подвеске на кочках", car_make: "Škoda" });

  await page.click("a:has-text('Посмотреть или отменить')");
  await page.waitForSelector(`text=Запись № ${number}`);
  await page.click("button:has-text('Отменить запись')");
  await page.click("button:has-text('Да, отменить')");
  await page.waitForSelector("text=Эта запись отменена");
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("admin: login, add slots on an empty day, close it, confirm a booking (phone viewport)", async () => {
  // Start from empty days far ahead, whatever earlier runs left behind.
  await pool.query("delete from slots where date >= (now() at time zone 'Europe/Tallinn')::date + 40 and status <> 'booked'");
  const { page, errors, ctx } = await phone();
  await page.goto(`${APP}/admin/calendar`);
  await page.waitForURL(/\/admin\/login/);
  await page.fill("input[name=email]", "owner@example.ee");
  await page.fill("input[name=password]", "wrong-password");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=Неверный e-mail или пароль.");
  await page.fill("input[name=password]", "test-password-123");
  await page.click("button[type=submit]");
  await page.waitForSelector('h1:has-text("Свободное время")');

  // An empty day two months ahead.
  await page.click('button[aria-label="Вперёд"]');
  await page.click('button[aria-label="Вперёд"]');
  await page.locator("div.grid-cols-7 > button[aria-pressed]").nth(16).click();
  await page.click("button:has-text('Добавить слоты')");
  await page.locator("[role=dialog] button:has-text('Создать слоты')").click();
  await page.waitForSelector("text=/^Создано слотов: \\d+/");
  await page.click("button:has-text('Закрыть день')");
  await page.click("button:has-text('Закрыть день?')");
  await page.waitForSelector("button:has-text('Открыть день')");
  assert.ok((await page.locator("button:has-text('Закрыто')").count()) > 0, "slots shown as blocked");

  // Confirm the newest web booking.
  const [b] = (await pool.query("select id, number from bookings where status = 'new' and source = 'web' order by created_at desc limit 1")).rows;
  if (b) {
    await page.goto(`${APP}/admin/bookings?id=${b.id}`);
    await page.waitForSelector("[role=dialog] >> text=Клиент написал");
    await page.click("[role=dialog] button:has-text('Подтвердить')");
    await page.waitForSelector("[role=dialog] .chip:has-text('Подтверждена')");
    const [row] = (await pool.query("select status from bookings where id = $1", [b.id])).rows;
    assert.equal(row.status, "confirmed");
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test("a signed-in non-admin cannot use the admin panel", async () => {
  const { page, ctx } = await phone();
  await page.goto(`${APP}/admin/login`);
  await page.fill("input[name=email]", "stranger@example.com");
  await page.fill("input[name=password]", "test-password-123");
  await page.click("button[type=submit]");
  await page.waitForSelector("text=У этого пользователя нет доступа к админке.");
  await ctx.close();
});
