from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class BaseModel(db.Model):
    """Base models.

    - Contains the serialize method to convert objects to a dictionary
    - Common field atrributes in the models
    """

    __abstract__ = True

    id = db.Column(db.Integer, primary_key=True)

    @staticmethod
    def to_camel_case(snake_str):
        """Format string to camel case."""
        title_str = snake_str.title().replace("_", "")
        return title_str[0].lower() + title_str[1:]

    def serialize(self):
        """Map model objects to dict representation."""
        return {self.to_camel_case(column.name): getattr(self, column.name)
                for column in self.__table__.columns}

    def save(self):
        """Save an instance of the model to the database."""
        try:
            db.session.add(self)
            db.session.commit()
            return True
        except SQLAlchemyError:
            db.session.rollback()
            return False

    def delete(self):
        """Delete an instance of the model from the database."""
        try:
            db.session.delete(self)
            db.session.commit()
            return True
        except SQLAlchemyError:
            db.session.rollback()
            return False

    @classmethod
    def fetch_all(cls):
        """Return all the data in the model."""
        return cls.query.all()

    @classmethod
    def count(cls):
        """Return the count of all the data in the model."""
        return cls.query.count()


class Question(BaseModel):
    """
    Question model
    """
    title = db.Column(db.String(100), nullable=False)
    text = db.Column(db.Text, nullable=False)
    answers = db.relationship('Answer', backref='question', lazy='dynamic')
    published = db.Column(db.Boolean, nullable=False, default=False)


class Answer(BaseModel):
    """
    Answer model
    """
    text = db.Column(db.Text, nullable=False)
    feedback = db.Column(db.Text, nullable=False)
    question_id = db.Column(
        db.Integer, db.ForeignKey('question.id'),
        nullable=False)


class User(BaseModel):
    """
    User model
    """
    email = db.Column(db.String(254), nullable=False, unique=True)
    password = db.Column(db.String, nullable=False)
