def validate_string(string):
    if string == "" or string is None:
        return False
    if " " in string:
        return False
    if len(string) > 12 or len(string) < 6:
        return False
    return True