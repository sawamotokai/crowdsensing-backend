import requests


def getAllTasks():
    res = requests.get('https://ece-ar.herokuapp.com/api/v0/tasks/all')
    users = res.json()['data']['tasks']
    return users


def getAllUsers():
    res = requests.get('https://ece-ar.herokuapp.com/api/v0/users/all')
    users = res.json()['data']['users']
    return users


print(getAllUsers())
print(getAllTasks())
