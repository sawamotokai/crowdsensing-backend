import requests

import random
import matplotlib.pyplot as plt
import math
import argparse
import time
import json
import datetime
import dateutil
from tqdm.notebook import tqdm
from math import sin, cos, sqrt, atan2, radians

nb = 49.27024149430249
sb = 49.25752305948695
wb = -123.25382384052033
eb = -123.24365280903588
x_step = 0.00001
y_step = 0.00001


def randomLocation():
    lat = random.random() * (nb - sb) + sb
    lng = random.random() * (eb - wb) + wb
    return (lat, lng)


def coordinates2MeterDist(lat1, lng1, lat2, lng2):
    """
    returns `distance between two points in meters
    """
    R = 6373.0
    lat1 = radians(lat1)
    lon1 = radians(lng1)
    lat2 = radians(lat2)
    lon2 = radians(lng2)
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c * 1000


class User:
    def __init__(self, unitTime=15):
        self.lat, self.lng = randomLocation()
        self.status = 'idle' if random.random() > 0.5 else 'waiting'
        self.task = None
        self.completed = 0
        self.dismissed = 0
        self.avgWalkingSpeed = 1  # m/s
        self.numWalks = 0
        self.walkingSpeedSum = 0
        self.timeLimit = 0
        self.unitTime = unitTime  # 1 cycle = unitTime seconds

    def setTask(self, task):
        assert self.task is None
        self.task = task
        self.task.increment()
        self.timeLimit = self.getExpectedTime()

    def getExpectedTime(self):
        assert self.task is not None
        dist = coordinates2MeterDist(
            self.lat, self.lng, self.task.lat, self.task.lng)
        time = dist / self.avgWalkingSpeed
        return time / self.unitTime

    def walk(self):
        self.numWalks += 1
        speed = random.random() + 0.5  # [0.5, 1.5]
        self.walkingSpeedSum += speed
        self.avgWalkingSpeed = self.walkingSpeedSum / self.numWalks
        direction = 0
        if self.status == 'busy':
            dx = self.task.lng - self.lng
            dy = self.task.lat - self.lat
            direction = math.atan2(dy, dx)
        else:
            direction = random.random() * 2 * math.pi

        dy = math.sin(direction) * speed * y_step * self.unitTime
        dx = math.cos(direction) * speed * x_step * self.unitTime
        nx = self.lng + dx
        ny = self.lat + dy
        if nx > eb or nx < wb:
            nx -= dx * 2
        if ny > nb or ny < sb:
            ny -= dy * 2

        # print(f'Walked distance of {coordinates2MeterDist(self.lat, self.lng, ny, nx)}m')
        self.lng = nx
        self.lat = ny

    def decideOnTask(self):
        rand = random.random()
        if rand > 0.3:
            self.status = 'busy'
        else:
            self.finishTask(completed=False)

    def isClose2Task(self):
        if self.task is None:
            return False
        dist = (self.lat - self.task.lat) ** 2 + \
            (self.lng - self.task.lng) ** 2
        return dist <= 4e-6

    def finishTask(self, completed=True):
        self.status = 'idle'
        if completed:
            self.completed += 1
            self.task.currentAoI = 0
            self.timeLimit = 0
        else:
            self.dismissed += 1
        self.task.decrement()
        self.task = None

    def check4TimeLimit(self):
        if self.task is None:
            return
        if self.task.currentAoI >= self.timeLimit:
            self.finishTask(completed=False)

    def toRow(self):
        """
        returns user matrices, where matrix = [lat, long, unknown, idle, waiting, busy, avg walking speed, completion ratio]
        """
        arr = [0] * 8
        arr[0] = self.lat
        arr[1] = self.lng
        status = self.status
        if status == 'unknown':
            arr[2] = 1
        if status == 'idle':
            arr[3] = 1
        if status == 'waiting':
            arr[4] = 1
        if status == 'busy':
            arr[5] = 1
        arr[6] = self.avgWalkingSpeed
        denom = (self.completed + self.dismissed)
        if denom > 0:
            arr[7] = self.completed / denom
        return arr


class Task:
    def __init__(self, targetAoI=10):
        self.lat, self.lng = randomLocation()
        self.targetAoI = targetAoI
        self.numUsers = 0
        self.currentAoI = 0

    def decrement(self):
        self.numUsers -= 1

    def increment(self):
        self.numUsers += 1

    def toRow(self):
        """
        returns task matrices, matrix = [lat, long, targetAoI, num_users, currentAoI]
        """
        arr = [0] * 5
        arr[0] = self.lat
        arr[1] = self.lng
        arr[2] = self.targetAoI
        arr[3] = self.numUsers
        arr[4] = self.currentAoI
        return arr


class Emulator:
    def __init__(self, num_timeslots, num_users, num_tasks, unitTime=15, targetAoI=10):
        super().__init__()
        self.num_timeslots = num_timeslots
        self.users = []
        self.tasks = []
        self.userLocations = [[] for _ in range(num_users)]
        for _ in range(num_users):
            self.users.append(User(unitTime=unitTime))
        for _ in range(num_tasks):
            self.tasks.append(Task(targetAoI=targetAoI))

    def getMatrixOf(self, arr):
        matrix = []
        for e in arr:
            matrix.append(e.toRow())
        return matrix

    def assignRandomTask2Users(self):
        for user in self.users:
            if user.status == 'busy':
                continue
            randomTask = random.choice(self.tasks)
            user.setTask(randomTask)
            user.decideOnTask()

    def assignTask2User(self, user, task):
        """ 
        from the task represented as an array, find identical task from the self.task list and assign the task to the user
        """
        if user.status == 'busy':
            return
        for t in self.tasks:
            if t.lat == task[0] and t.lng == task[1]:
                user.setTask(t)
                user.decideOnTask()
                return
        assert False

    def check4TimeLimits(self):
        for user in self.users:
            user.check4TimeLimit()

    def updateCurrentAoI(self):
        for task in self.tasks:
            task.currentAoI += 1

    def recordUserMoves(self, idx):
        user = self.users[idx]
        location = (user.lat, user.lng)
        self.userLocations[idx].append(location)

    def getCost(self):
        """
        returns total AoI of all the tasks + lambda * dist_travelled_by_user_to_reward
        """
        cost = 0
        const = 10
        for task in self.tasks:
            cost += task.currentAoI
        for user in self.users:
            if user.task is None:
                continue
            cost += const * \
                coordinates2MeterDist(user.lat, user.lng,
                                      user.task.lat, user.task.lng)
        return cost

    def step(self, tasks):
        """
        REQUIRES: tasks = task[# of users]
        EFFECTS: returns cost of the environment
        MODIFIES: the whole system by stepping every user forward modifying the users states
        """
        self.check4TimeLimits()
        self.updateCurrentAoI()
        for i in range(len(self.users)):
            user = self.users[i]
            self.assignTask2User(user, tasks[i])
            user.walk()
            self.recordUserMoves(i)
            if user.isClose2Task():
                user.finishTask()
        cost = self.getCost()
        return cost
