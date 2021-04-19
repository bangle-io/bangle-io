test('hi', async () => {
  await page.goto('http://localhost:1234');
  await expect(page.title()).resolves.toMatch('Bangle App');
});
