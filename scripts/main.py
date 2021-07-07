from emulator import Emulator, coordinates2MeterDist
from itertools import chain
import numpy as np
import matplotlib.pyplot as plt
from tqdm import trange

num_episodes = 50
num_time_steps = 10000
num_users = 30
num_tasks = 5


def extractUsersAndTasks(state):
    tasks = state[:num_tasks * 5].reshape((num_tasks, -1))
    users = state[num_tasks * 5:].reshape((num_users, -1))
    return tasks, users


def assignRandomly(state):
    """
    EFFECT: returns an array of tasks of the same size as the num of users
    """
    tasks, users = extractUsersAndTasks(state)
    num_of_tasks = tasks.shape[0]
    num_of_users = users.shape[0]
    random_indices = np.random.choice(
        num_of_tasks, size=num_of_users, replace=True)
    random_tasks = tasks[random_indices, :]
    return random_tasks


def assignClosest(state):
    tasks, users = extractUsersAndTasks(state)
    li = []
    for user in users:
        ret = None
        mnDist = 1e9
        for task in tasks:
            dist = coordinates2MeterDist(user[0], user[1], task[0], task[1])
            if dist < mnDist:
                mnDist = dist
                ret = task
        li.append(ret)
    return li


def assignLargestAoI(state):
    tasks, users = extractUsersAndTasks(state)
    li = [0] * len(users)
    li = [[] for _ in range(len(users))]
    tasks = tasks[tasks[:, 4].argsort()[::-1]]
    for i in range(len(users)):
        li[i] = tasks[i % len(tasks)]
    return li


def plot(results):
    x = np.linspace(0, num_time_steps, num_time_steps)
    fig, ax = plt.subplots()  # Create a figure and an axes.
    for key in results:
        ax.plot(x, results[key], label=key)
    ax.set_xlabel('Time step')  # Add an x-label to the axes.
    ax.set_ylabel(
        f'Avg reward over {num_episodes} episodes')
    ax.set_title(
        f'Comparison btwn dif assignment algos with {num_users} users and {num_tasks} tasks')
    ax.legend()  # Add a legend.
    plt.savefig(f'result_{num_users}u_{num_tasks}t.png')


def run(func):
    rewardMatrix = []
    for _ in trange(num_episodes):
        emulator = Emulator(
            num_timeslots=1, num_users=num_users, num_tasks=num_tasks)
        totalReward = []
        for step in range(num_time_steps):
            tasks = np.asarray(emulator.getMatrixOf(emulator.tasks)).flatten()
            users = np.asarray(emulator.getMatrixOf(emulator.users)).flatten()
            state = np.concatenate([tasks, users])
            tasks = func(state)
            reward = emulator.step(tasks)
            totalReward.append(reward)
        rewardMatrix.append(totalReward)
    matrix = np.asarray(rewardMatrix)
    means = matrix.mean(axis=0)
    return means


dic = {}
dic['largest AoI'] = run(assignLargestAoI)
dic['random'] = run(assignRandomly)
dic['closest task'] = run(assignClosest)
plot(dic)
