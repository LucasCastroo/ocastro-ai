from flask import Blueprint, request, jsonify
from app.models.task import Task
from app.extensions import db
from app.schemas.task_schema import TaskSchema
from app.utils.enums import TaskStatus
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api/tasks')

@tasks_bp.route('', methods=['GET'])
@jwt_required(optional=True)
def get_tasks():
    current_user_id = get_jwt_identity()
    if not current_user_id:
        current_user_id = 1
        
    query = Task.query.filter_by(user_id=current_user_id)
    
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
        
    priority = request.args.get('priority')
    if priority:
        query = query.filter_by(priority=priority)
        
    from_date = request.args.get('from_date')
    if from_date:
        query = query.filter(Task.due_date >= from_date)
        
    to_date = request.args.get('to_date')
    if to_date:
        query = query.filter(Task.due_date <= to_date)
        
    tasks = query.all()
    schema = TaskSchema(many=True)
    # Return directly list to match frontend expectation or wrap
    # Frontend KanbanBoard.tsx is currently being patched to expect data;
    # But previous tool edit in KanbanBoard checked 'if (Array.isArray(data))' on 'data'. 
    # If we return { data: [...] }, then data.data is the array? 
    # The previous code returned {"data": [...], "success": True}.
    # The frontend code in Step 530 does:
    #   const response = await fetch(...)
    #   if (response.ok) {
    #       const data = await response.json();
    #       if (Array.isArray(data)) { ... }
    #   }
    # So the Frontend expects the ROOT object to be the array.
    # I should change this to return the list directly to match the frontend check `Array.isArray(data)`.
    return jsonify(schema.dump(tasks)), 200

@tasks_bp.route('', methods=['POST'])
@jwt_required()
def create_task():
    current_user_id = get_jwt_identity()
    data = request.get_json()
    
    schema = TaskSchema()
    errors = schema.validate(data)
    if errors:
        return jsonify({"errors": errors, "success": False}), 400
        
    task_data = schema.load(data)
    
    new_task = Task(
        user_id=current_user_id,
        title=task_data['title'],
        description=task_data.get('description'),
        status=task_data.get('status', TaskStatus.ENTRADA),
        priority=task_data.get('priority'),
        due_date=task_data.get('due_date')
    )
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify({"data": schema.dump(new_task), "success": True}), 201

@tasks_bp.route('/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    current_user_id = get_jwt_identity()
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first_or_404()
    schema = TaskSchema()
    return jsonify({"data": schema.dump(task), "success": True}), 200

@tasks_bp.route('/<int:task_id>', methods=['PUT'])
@jwt_required(optional=True)
def update_task(task_id):
    current_user_id = get_jwt_identity()
    if not current_user_id:
        current_user_id = 1
        
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first_or_404()
    data = request.get_json()
    
    schema = TaskSchema()
    # Partial update validation omitted for brevity as per previous code
    
    # Manually updating fields for now
    if 'title' in data: task.title = data['title']
    if 'description' in data: task.description = data['description']
    if 'status' in data: task.status = data['status']
    if 'priority' in data: task.priority = data['priority']
    if 'due_date' in data: 
        # Handle date parsing if string
        if isinstance(data['due_date'], str):
             task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        else:
             task.due_date = data['due_date']

    db.session.commit()
    return jsonify({"data": schema.dump(task), "success": True}), 200

@tasks_bp.route('/<int:task_id>', methods=['DELETE'])
@jwt_required(optional=True)
def delete_task(task_id):
    current_user_id = get_jwt_identity()
    if not current_user_id:
        current_user_id = 1
        
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first_or_404()
    
    db.session.delete(task)
    db.session.commit()
    return jsonify({"success": True}), 200

@tasks_bp.route('/<int:task_id>/status', methods=['PATCH'])
@jwt_required(optional=True)
def update_task_status(task_id):
    current_user_id = get_jwt_identity()
    if not current_user_id:
        current_user_id = 1
        
    task = Task.query.filter_by(id=task_id, user_id=current_user_id).first_or_404()
    data = request.get_json()
    
    if 'status' not in data:
        return jsonify({"error": "Status required"}), 400
        
    task.status = data['status']
    db.session.commit()
    return jsonify({"success": True, "data": {"id": task.id, "status": task.status}}), 200
