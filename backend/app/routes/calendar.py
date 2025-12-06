from flask import Blueprint, request, jsonify
from app.services.calendar_service import CalendarService
from app.schemas.task_schema import TaskSchema
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api/calendar')

@calendar_bp.route('/summary', methods=['GET'])
@jwt_required()
def calendar_summary():
    current_user_id = get_jwt_identity()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not start_date or not end_date:
        return jsonify({"error": "Start and End date required"}), 400

    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    summary = CalendarService.get_summary(current_user_id, start_date_obj, end_date_obj)
    return jsonify({"success": True, "data": summary}), 200

@calendar_bp.route('/day/<string:date_str>', methods=['GET'])
@jwt_required()
def day_tasks(date_str):
    current_user_id = get_jwt_identity()
    try:
        date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
         return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    tasks = CalendarService.get_tasks_by_date(current_user_id, date_obj)
    schema = TaskSchema(many=True)
    return jsonify({"success": True, "data": schema.dump(tasks)}), 200
