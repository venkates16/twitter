let express = require('express')
let app = express()
app.use(express.json())
let path = require('path')

let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let {open} = require('sqlite')
let sqlite3 = require('sqlite3')
let path_drive = path.join(__dirname, 'twitterClone.db')
let dataBase = null

let initailizing_db_server = async () => {
  try {
    dataBase = await open({
      filename: path_drive,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running on Port 3000')
    })
  } catch (error) {
    console.log(error.message)
  }
}

initailizing_db_server()

app.post('/register/', async (request, response) => {
  let {username, password, name, gender} = request.body
  // console.log(request.body)
  let query_get = `select
   * 
   from 
   user
   where username ="${username}" 
  `

  let db_response = await dataBase.get(query_get)
  let password_hash = await bcrypt.hash(password, 10)

  if (db_response === undefined) {
    if (password.length < 6) {
      response.status(400)
      response.send('Password is too short')
    } else {
      let insert_details = `
      insert into user(username,name,password,gender)
      values("${username}","${name}","${password_hash}","${gender}")
      `
      await dataBase.run(insert_details)

      response.status(200)
      response.send('User created successfully')
    }
  } else {
    // response.send(db_response)
    response.status(400)
    response.send('User already exits')
  }
})

app.post('/login/', async (request, response) => {
  let {username, password} = request.body
  console.log(password)
  let query = `
  select 
  *
  from
  user
  where
  username="${username}";
  `
  let query_response = await dataBase.get(query)
  // console.log(query_response)

  if (query_response === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    //console.log(query_response)
    let decript = await bcrypt.compare(password, query_response.password)
    if (decript === true) {
      let payload = {username: 'adam_richard'}
      let tokens = jwt.sign(payload, 'venky')
      response.status(200)
      response.send({jwtToken: tokens})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

let middleWare_function = (request, response, next) => {
  //console.log('hii')
  let access_token = request.headers['authorization']
  let permission_token = null
  if (access_token === undefined) {
    response.status(401)

    response.send('Invalid JWT Token')
  } else {
    permission_token = access_token.split(' ')[1]
  }
  if (permission_token != undefined) {
    jwt.verify(permission_token, 'venky', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send(payload)
      } else {
        request.username = payload.username
        next()
      }
    })
  }
}

app.get(
  '/user/tweets/feed/',
  middleWare_function,
  async (request, response) => {
    let {username} = request
    //console.log(username)

    let query = `
    select 
    username,tweet,date_time
    from
    user Natural join tweet
  
    order by 
    date_time desc 
    
    limit 4;
    `
    let db_response = await dataBase.all(query)
    console.log(db_response)
    response.send(db_response)
  },
)

app.get('/user/following/', middleWare_function, async (request, response) => {
  let query = `
  select 
  name as name 
  from 
  user  join follower
  on user.user_id=follower.follower_user_id 
  `
  let db_response = await dataBase.all(query)
  response.send(db_response)
})

app.get('/user/followers/', middleWare_function, async (request, response) => {
  let query = `
  select 
  name as name 
  from 
  user inner join follower
  on user.user_id=follower.following_user_id 
  `
  let db_response = await dataBase.all(query)
  response.send(db_response)
})

app.get('/tweets/:tweetId/', middleWare_function, async (request, response) => {
  let {tweetId} = request.params
  console.log(tweetId)

  let query = `
  select  
  tweet,
  count(like_id) as likes ,
  count(reply) as replies
  ,
  date_time
  from
  (like natural join tweet  
 )as t Natural join reply 
  where 
  tweet_id=${tweetId}


  `
  let db_response = await dataBase.get(query)
  response.send(db_response)
})

app.get(
  '/tweets/:tweetId/likes/',
  middleWare_function,
  async (request, response) => {
    let {tweetId} = request.params
    let query = `
    select 
    username
    from 
    user natural join tweet  as t natural join like
    where 
    tweet_id =${tweetId}

    `
    let db_response = await dataBase.all(query)
    let value = db_response.username
    response.send({
      "likes": value,
    })
  },
)

app.get(
  '/tweets/:tweetId/replies/',
  middleWare_function,
  async (request, response) => {
    let {tweetId} = request.params
    let query = `
    select 
    name ,
    reply 
    from 
    user inner join reply on user.user_id=reply.user_id 
    where 
    tweet_id =${tweetId}

    `
    let db_response = await dataBase.all(query)
    response.send(db_response)
  },
)

app.get('/user/tweets/', middleWare_function, async (request, response) => {
  let query = `
  select 
  tweet ,count(like_id) as likes ,
 count(reply_id) as replies ,
  date_time as dateTime
  from
  (like inner join tweet on like.user_id =tweet.user_id) as t inner join reply on t.user_id=reply.user_id
  `
  let db_response = await dataBase.all(query)
  response.send(db_response)
})

app.post('/user/tweets/', middleWare_function, async (request, response) => {
  let {tweet} = request.body
  let query = `
  insert into tweet(tweet)
  values("${tweet}");
  `
  await dataBase.run(query)
  response.send('Created a Tweet')
})

app.delete(
  '/tweets/:tweetId',
  middleWare_function,
  async (request, response) => {
    let {tweetId} = request.params
    // console.log(tweetId)
    let query = `
  Delete 
   from 
    tweet
    where 
    tweet_id=${tweetId}
  `

    await dataBase.run(query)
    response.send('Tweet Removed')
  },
)

module.exports = app
