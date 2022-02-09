import os
from flask import Flask, request, json
from flask_migrate import Migrate

from config import app_configuration
from college_board.models import db, Answer, Question


def create_app(test_config=None):
    # create and configure the app
    app = Flask(__name__)
    environment = os.getenv("FLASK_ENV")
    app.config.from_object(app_configuration[environment])

    # initialize database
    db.init_app(app)

     # initilize migration
    Migrate(app, db)

    # a simple page that says hello
    @app.route('/hello')
    def hello():
        return 'Hello, World!'

    @app.route('/answer', methods=['POST'])
    def create_answer():
        payload = request.get_json()
        for field in ['text', 'feedback']:
            if not payload.get(field):
                return {
                    "status": "fail",
                    "data": {"message": "answer must have text and feedback"}
                }, 400

        answer = Answer(**payload)
        if answer.save():
            return json.jsonify(
                status="success",
                data=answer.serialize()
            )
        else:
            return jsonify(
                status="fail",
                data={
                    "message": "Answer could not be created, Please try again"
                }
            ), 500

    @app.route('/question', methods=['POST'])
    def create_question():
        payload = request.get_json()
        print(payload, "this is payload")
        for field in ['title', 'text', 'published']:
            if payload.get(field) is None:
                return json.jsonify(
                    status="fail",
                    data={"message": "question must have title, text and published fields"}
                ), 400

        question = Question(**payload)
        if question.save():
            return json.jsonify(
                status="success",
                data=question.serialize()
            )
        else:
            return json.jsonify(
                status="fail",
                data={
                    "message": "Question could not be created, Please try again"
                }
            ), 500

    return app
