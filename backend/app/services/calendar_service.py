from app.models.task import Task
from app.extensions import db
from collections import defaultdict

class CalendarService:
    @staticmethod
    def get_summary(user_id, start_date, end_date):
        # Filtering tasks within date range
        # Assuming due_date is what we are looking at. 
        # If due_date is None, maybe it's not on the calendar or shown in "Today" if pertinent.
        # Here we strictly filter by due_date range.
        
        tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.due_date >= start_date,
            Task.due_date <= end_date
        ).all()

        summary = defaultdict(list)
        for task in tasks:
            summary[str(task.due_date)].append({
                "id": task.id,
                "title": task.title,
                "status": task.status,
                "priority": task.priority
            })
            
        # Format as list of objects
        result = []
        for date_str, tasks_list in summary.items():
            result.append({
                "date": date_str,
                "tasks": tasks_list
            })
            
        return result

    @staticmethod
    def get_tasks_by_date(user_id, date_obj):
        return Task.query.filter(
            Task.user_id == user_id, 
            Task.due_date == date_obj
        ).all()
