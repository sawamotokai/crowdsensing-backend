import requests

import random
import matplotlib.pyplot as plt
import math
import argparse
import time
import json
import datetime
import dateutil

parser = argparse.ArgumentParser(description='Process some user settings.')
parser.add_argument(
    '--username', help='leave blank if it is a new user.', default="")

args = parser.parse_args()


def send_request(url, data, method):
    headers = {"content-type": "application/json"}
    if method == 'PUT':
        res = requests.put(url, data=json.dumps(data), headers=headers)
    if method == 'POST':
        res = requests.post(url, data=json.dumps(data), headers=headers)
    return res


def timeLimitExceeded(a):
    assignedTime = dateutil.parser.isoparse(a['assignedTime'])
    dt = datetime.datetime.now(datetime.timezone.utc)
    now = dt.replace(tzinfo=datetime.timezone.utc)
    if assignedTime + datetime.timedelta(minutes=a['timeLimit']) < now:
        return True
    return False

# cost = lambda * dist / AoI


# global
BASE_URL = "http://localhost:3000/api/v0"
# BASE_URL = "https://crowd-sensing.herokuapp.com/api/v0"
nb = 49.27024149430249
sb = 49.25752305948695
wb = -123.25382384052033
eb = -123.24365280903588
x_step = 0.00015
y_step = 0.00015


class Service:
    def __init__(self, num_timeslots, username=""):
        super().__init__()
        if username == "":
            self.createUser()
        else:
            self.username = username
        self.initStatus()
        self.num_timeslots = num_timeslots
        self.nb = nb
        self.eb = eb
        self.sb = sb
        self.wb = wb
        self.x_step = x_step
        self.y_step = y_step
        self.task = None

    def run(self):
        for _ in range(self.num_timeslots):
            print(self.status)
            rand = random.random()
            if rand > 0.3 and self.status == "idle":
                self.status = 'waiting'
                url = f"{BASE_URL}/users/wait_for_task"
                res = send_request(
                    url, data={"username": self.username}, method='PUT')
                print(res.content)
            if self.status == 'busy':
                if self.task is None:
                    self.task = self.pullTask()
                if self.task is None:
                    self.status = 'idle'
                elif self.isClose2Task():
                    self.completeTask()
            self.walk()
            self.updateLocation()
            if self.status == "waiting":
                self.task = self.pullTask()
                if self.task is not None:
                    self.decideTask()

            time.sleep(5)

    def initStatus(self):
        try:
            url = f'{BASE_URL}/users?username={self.username}'
            user = requests.get(url).json()
            self.status = user['data']['user']['status']
            self.lat = user['data']['user']['location']['lat']
            self.lng = user['data']['user']['location']['lng']
        except Exception as e:
            print(e)
            self.status = 'idle'

    def isClose2Task(self):
        dist = (self.lat - self.task['trashbin']['location']['lat']) ** 2 + \
            (self.lng - self.task['trashbin']['location']['lng']) ** 2
        print('distance to the object: ', dist)
        # TODO: set the threshold
        return dist <= 4e-6
        return False

    def walk(self):
        direction = 0
        if self.status == 'busy':
            dx = self.task['trashbin']['location']['lng'] - self.lng
            dy = self.task['trashbin']['location']['lat'] - self.lat
            direction = math.atan2(dy, dx)
        else:
            direction = random.random() * 2 * math.pi
        speed = 2.0*random.random()+1.0
        dx = math.cos(direction) * speed * self.x_step
        dy = math.sin(direction) * speed * self.y_step
        nx = self.lng + dx
        ny = self.lat + dy
        # print(self.lng, self.lat, dx, dy, nx, ny)

        if nx > self.eb or nx < self.wb:
            nx -= dx * 2
        if ny > self.nb or ny < self.sb:
            ny -= dy * 2
        self.lng = nx
        self.lat = ny
        return (self.lng, self.lat, speed)

    def updateLocation(self):
        try:
            url = f'{BASE_URL}/users/location'
            data = {
                'username': self.username,
                'lat': self.lat,
                'lng': self.lng,
            }
            res = send_request(url, data=data, method='PUT')
            print(res.content)
        except Exception as e:
            print(e)
            exit(1)

    def createUser(self):
        print("Username:")
        self.username = input()
        url = f"{BASE_URL}/users"
        data = {
            "username": self.username
        }
        try:
            res = send_request(url, data={
                "username": self.username
            }, method='POST')
            if res.status_code == 400:
                print('Exisiting User')
            if res.status_code == 200:
                print("New User")
        except Exception as e:
            print(e)
            exit(1)

    def pullTask(self):
        try:
            url = f'{BASE_URL}/users/currentTasks?username={self.username}'
            res = requests.get(url)
            if res.status_code == 200:
                print("Task found")
                assignment = res.json()['assignments'][0]
                task = assignment['task']
                self.assignmentID = assignment['_id']
                return task
            elif res.status_code == 404:
                print("TASK NOT FOUND")
                return None
            elif res.status_code == 400:
                print("Error")
                return None
        except Exception as e:
            print(e)
            exit(1)

    def decideTask(self):
        rand = random.random()
        if rand > 0.3:
            print("completing the task")
            self.status = 'busy'
        else:
            self.dismissTask()

    def completeTask(self):
        print('completed the task')
        try:
            url = f'{BASE_URL}/tasks/complete'
            data = {
                'assignmentID': self.assignmentID,
            }
            res = send_request(url, data=data, method='PUT')
            print(res.content)
            self.status = 'idle'
        except Exception as e:
            print(e)
            exit(1)

    def dismissTask(self):
        try:
            print("dismissing the task")
            url = f'{BASE_URL}/tasks/dismiss'
            data = {
                "taskID": self.task['_id'],
                "username": self.username
            }
            res = send_request(url, data=data, method='PUT')
            print(res.content)
            self.status = 'idle'
        except Exception as e:
            print(e)
            exit(1)

        pass


"""
program that prints random walks
"""

service = Service(username=args.username, num_timeslots=10)
service.run()
