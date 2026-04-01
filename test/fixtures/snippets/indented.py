class TestUsers:
    def test_create(self):
        # region: create_user
        from myapp import client

        user = client.create_user(name="Alice")
        print(user)
        # endregion: create_user
        assert user["name"] == "Alice"
