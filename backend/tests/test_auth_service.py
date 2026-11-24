from app.services.auth import decode_access_token, hash_password, verify_password


def test_password_hash_is_not_plaintext() -> None:
    password_hash = hash_password("correct horse battery staple")

    assert password_hash != "correct horse battery staple"
    assert verify_password("correct horse battery staple", password_hash)
    assert not verify_password("wrong password", password_hash)


def test_invalid_access_token_is_rejected() -> None:
    try:
        decode_access_token("not-a-valid-token")
    except ValueError as error:
        assert str(error) == "Invalid or expired access token."
    else:
        raise AssertionError("Invalid access token should be rejected.")
