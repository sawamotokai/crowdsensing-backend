import requests

import random
import matplotlib.pyplot as plt
import math
import argparse
import time
import json

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


class ue_rand_walk ():
    def __init__(self, north, east, south, west, x_step, y_step):
        self.nb = north
        self.eb = east
        self.sb = south
        self.wb = west
        self.x_step = x_step
        self.y_step = y_step
        self.lng = -123.25006520184665
        self.lat = 49.26252990000112

    def walk(self):
        speed = 2.0*random.random()+1.0
        direction = random.random() * 2 * math.pi
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


# global
BASE_URL = "http://localhost:3000/api/v0"
# BASE_URL = "https://crowd-sensing.herokuapp.com/api/v0"
nb = 49.27024149430249
sb = 49.25752305948695
wb = -123.25382384052033
eb = -123.24365280903588
x_step = 0.00015
y_step = 0.00015


def sayhi():
    print('hi')


class Service:
    def __init__(self, num_timeslots, username=""):
        super().__init__()
        self.username = username
        self.num_timeslots = num_timeslots
        self.status = 'idle'
        self.ue = ue_rand_walk(north=nb, east=eb, south=sb, west=wb,
                               x_step=x_step, y_step=y_step)

    def run(self):
        if self.username == "":
            self.createUser()
        for _ in range(self.num_timeslots):
            rand = random.random()
            if rand > 0.3 and self.status == "idle":
                self.status = 'waiting'
                url = f"{BASE_URL}/users/wait_for_task"
                res = send_request(
                    url, data={"username": self.username}, method='PUT')
                print(res.content)
            self.ue.walk()
            self.updateLocation()
            print(self.status)
            if self.status == "waiting":
                task = self.pullTask()
                if task is not None:
                    # TODO: if Task time limit is exceeded: continue
                    self.decideTask(task)
            time.sleep(5)

    def updateLocation(self):
        try:
            url = f'{BASE_URL}/users/location'
            data = {
                'username': self.username,
                'lat': self.ue.lat,
                'lng': self.ue.lng,
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
            send_request(url, data={
                "username": self.username
            }, method='POST')
        except Exception as e:
            print(e)
            exit(1)

    def pullTask(self):
        try:
            url = f'{BASE_URL}/users/currentTask?username={self.username}'
            res = requests.get(url)
            if res.status_code == 200:
                task = res.json()['data']['task']
                return task
            elif res.status_code == 400:
                print("TASK NOT FOUND")
                return None
        except Exception as e:
            print(e)
            exit(1)

    def decideTask(self, task):
        rand = random.random()
        if rand > 0.3:
            self.completeTask(task)
        else:
            self.dismissTask(task)
        self.status = "idle"

    def completeTask(self, task):
        try:
            print("completing the task")
            url = f'{BASE_URL}/tasks/complete'
            data = {
                "taskID": task['_id'],
                "username": self.username
            }
            res = send_request(url, data=data, method='PUT')
            print(res.content)
        except Exception as e:
            print(e)
            exit(1)

    def dismissTask(self, task):
        try:
            print("dismissing the task")
            url = f'{BASE_URL}/tasks/dismiss'
            data = {
                "taskID": task['_id'],
                "username": self.username
            }
            res = send_request(url, data=data, method='PUT')
            print(res.content)
        except Exception as e:
            print(e)
            exit(1)

        pass


"""
program that prints random walks
"""

service = Service(username=args.username, num_timeslots=10)
service.run()


# x_data_plot = []
# y_data_plot = []

# for i in range(1000):  # change the number for the amount of iterations
#     (x, y, z) = ue.walk()  # returns x, y, and speed
#     x_data_plot.append(x)
#     y_data_plot.append(y)

# plt.axis([wb, eb, sb, nb])
# plt.plot(x_data_plot, y_data_plot)
# plt.savefig('plot.png')
