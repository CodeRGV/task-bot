
Task Bot
--------

At Code RGV we need a way to track our tasks. This bot does so, and makes our lives better™.

## Commands
  @task add {description} #section [1/1/2016] @name  
  @task finish|done|complete {id}  
  @task list  
  @task update {id} 
  @task remove|rm|delete|del {id}  
  @task note|comment {id}  
  @task aid|assist|assign {id} @name  
  @task abandon|drop {id}  
  @task help  

## Task model
* *id*
* *creator*
* *status*
* *description*
* *section*
* *notes*
* *due*
* *assigned*

## Getting Started
> git clone git@github.com/CodeRGV/task-bot.git  
> cd task-bot  
> npm install  
> cp .env.example .env  
> \# email support@codergv.org for .env settings  
> rhc set-env .env taskbot # if you're using openshift  
> node bot.js  

### Analytics
 - rank users that completed tasks
 - number of tasks pending (per channel)
 - number of tasks overdue (per channel)
 - number of tasks completed (per week/month, per channel/user)

View dashboard at: `/board`
