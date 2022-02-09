from flask_jwt import jwt
from flask import g, request, jsonify
from college_board.models import User


NO_TOKEN_MSG = (
    "Bad request. Header does not contain an authorization token."
)
NO_BEARER_MSG = (
    "Invalid Token. The token should begin with the word 'Bearer '."
)
SERVER_ERROR_MSG = 'Authorization failed. Please contact support.'


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        authorization_token = request.headers.get('Authorization')
        if not authorization_token:
            response = jsonify({
                "status": "fail",
                "data": {"message": NO_TOKEN_MSG}
            })
            return response, 400

        if 'bearer ' not in authorization_token.lower():
            response = jsonify({
                "status": "fail",
                "data": {"message": NO_BEARER_MSG}
            })
            return response, 400

        if not public_key:
            LOGGER.critical('The public key is not set in the environment')
            response = jsonify({
                "status": "fail",
                "data": {"message": SERVER_ERROR_MSG}
            })
            return response, 500

        try:
            authorization_token = authorization_token.split(' ')[1]
            payload = jwt.decode(
                authorization_token,
                ,
                algorithms=['RS256'],
                options={
                    'verify_signature': True,
                    'verify_exp': True
                }
            )
