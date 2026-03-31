// region: fetch_data
const data = await fetch('/api/users');
const users = await data.json();
console.log(users);
// endregion: fetch_data

// region: with_expects
const sum = (a, b) => a + b;
console.log(sum(2, 3));
expect(sum(2, 3)).toBe(5); // test-only
// endregion: with_expects
