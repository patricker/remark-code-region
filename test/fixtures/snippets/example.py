# region: hello
name = "World"
print(f"Hello, {name}!")
# endregion: hello

# region: with_asserts
result = 2 + 2
print(result)
assert result == 4  # test-only
assert type(result) == int  # test-only
# endregion: with_asserts

# region: multiline
def greet(name):
    return f"Hi, {name}"

message = greet("Alice")
print(message)
assert message == "Hi, Alice"
# endregion: multiline
