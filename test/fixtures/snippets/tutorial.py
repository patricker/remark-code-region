# region: step1
from myapp import App

app = App()
app.start()
# endregion: step1

# region: step2
from myapp import App

app = App()
app.configure(port=8080)
app.start()
# endregion: step2

# region: step3
from myapp import App
from myapp.middleware import auth

app = App()
app.configure(port=8080)
app.add_middleware(auth)
app.start()
# endregion: step3
