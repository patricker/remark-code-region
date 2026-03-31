// region: read_all
use mhn_core::{read_all, Dialect};

let rows = read_all("Name|Age\n1|Alice", &Dialect::default())?;
println!("{:?}", rows);
// endregion: read_all

// region: with_asserts
let rows = read_all("A|B\n1|2", &Dialect::default())?;
assert_eq!(rows.len(), 1);
assert_eq!(rows[0]["A"], Value::str("1"));
// endregion: with_asserts
