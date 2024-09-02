const express = require('express')
const app = express()
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const jwt = require('jsonwebtoken')
app.use(express.json())
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is running at http://localhost3000')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
  }
}
initializeDBAndServer()
const authenticateToken = (request, response, next) => {
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.user = payload;
        next()
      }
    })
  }
}
app.post('/login/', async (request, response) => {
  const { username, password } = request.body;
  const query = `SELECT * FROM user WHERE username = '${username}';`;
  const user = await db.get(query);

  if (user === undefined) {
    response.status(400);
    response.send('Invalid user');
  } else if (user.password === password) {
    const payload = { username: username };
    const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN');
    response.send({ jwtToken });
  } else {
    response.status(400);
    response.send('Invalid password');
  }
});

app.get('/states/', authenticateToken, async (request, response) => {
  const query = `select state_id as stateId , state_name as stateName,population from state`
  const stateArray = await db.all(query)
  response.send(stateArray)
})
app.get('/states/:stateId', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const query = `select state_id as stateId,state_name as stateName,population from state where state_id=${stateId}`
  const specificState = await db.get(query)
  response.send(specificState)
})
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const query = `insert into district (district_name,state_id,cases,cured,active,deaths) values('${districtName}',${stateId},${cases},${cured},${active},${deaths})`
  await db.run(query)
  response.send('District Successfully Added')
})
app.get(
  '/districts/:districtId',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const query = `select district_id as districtId,
  district_name as districtName,
  state_id as stateId,
  cases,
  cured,
  active,
  deaths from district where district_id =${districtId};`
    let specificDistrict = await db.get(query)
    response.send(specificDistrict)
  },
)
app.delete(
  '/districts/:districtId',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const query = `delete from district where district_id=${districtId}`
    await db.run(query)
    response.send('District Removed')
  },
)
app.put('/districts/:districtId', authenticateToken, (request, response) => {
  const {districtId} = request.params
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const query = `update district set district_name ='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} where district_id=${districtId} `
  db.run(query)
  response.send('District Details Updated')
})
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const query = `select sum(cases) as totalCases,sum(cured) as totalCured,sum(active) as totalActive,sum(deaths)as totalDeaths from state inner join district on state.state_id=district.state_id where state. state_id=${stateId};`
    const totalObj = await db.get(query)
    response.send(totalObj)
  },
)
app.get(
  '/districts/:districtId/details/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const query = `select state.state_name as stateName from state inner join district on state.state_id=district.state_id where district_id=${districtId}`
    const stateN = await db.get(query)
    response.send(stateN)
  },
)

module.exports = app
