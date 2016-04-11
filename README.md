
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

### Understanding the ORM
There are three models: `Task`, `User`, and `Channel`. The `Collections` model helps with multiple of the models in a set (list). Out of the three only `User` and `Channel` are located within the root of the storage. The tasks are part of a channel. Tasks may refer to users. 

`User` and `Channel` are also part of Slack data. We do our best to pull the data from Slack, and reflect it locally. 

Third issue is that data saved may not include all data we'd like (we're being agile). So the models should accept previous use, and accept new use. E.g. user's name were not available, and can be found by asking the Slack api. Model should lookup and save when available without affecting business logic. 

As it stands, all the models initialize the data to conform to current use. Specific properties (e.g. name) are promise type interfaces.

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



