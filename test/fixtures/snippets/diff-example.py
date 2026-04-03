# region: v1_handler
def handler(request):
    return Response(request.body)
    assert request.body
# endregion: v1_handler

# region: v2_handler
def handler(request):
    validate(request)
    return Response(request.body, status=200)
    assert request.body
# endregion: v2_handler
