import requests


def getAllTasks():
    res = requests.get('https://ece-ar.herokuapp.com/api/v0/tasks/all')
    users = res.json()['data']['tasks']
    return users


def getAllUsers():
    res = requests.get('https://ece-ar.herokuapp.com/api/v0/users/all')
    users = res.json()['data']['users']
    return users


user = getAllUsers()[0]
username = user['username']
print(username)

print(getAllTasks())
timeSlots = linspace(1, 10000)

for timeSlots
# Check the state of all the tasks and users
Status_Tasks = [time_lastUpdate, ...]
Status_Users

# Construct a funtion to assign task (to each idle and waiting)
(neural_networks) array_of_user_assignment = [taskUsers1, taskUser2, ....]

# update the database based on the task assignment
