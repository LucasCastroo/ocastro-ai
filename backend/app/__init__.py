from flask import Flask
from app.config import config
from app.extensions import db, migrate, jwt, cors
from app.routes.auth import auth_bp
from app.routes.tasks import tasks_bp
from app.routes.calendar import calendar_bp
from app.routes.voice import voice_bp

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    # Enable CORS for frontend URL
    cors.init_app(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(calendar_bp)
    app.register_blueprint(voice_bp)

    return app
