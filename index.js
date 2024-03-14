const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname + "/html")));

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

app.post("/user/signup", async (req, res) => {
  const [user] = await pool.query(
    "SELECT * FROM Users WHERE email=?",
    req.body.email
  );
  if (user.length) {
    throw new Error("User Exists");
  } else {
    const [result] = await pool.query(
      `
    INSERT INTO Users (email, password, company)
    VALUES (?, ?, ?)
    `,
      [req.body.email, bcrypt.hashSync(req.body.password, 10), req.body.company]
    );
    console.log(result);
    if (req.body.company) {
      const [compresult] = await pool.query(
        `
      INSERT INTO Company (email, name, companyname, role, descr)
      VALUES (?, ?, ?,?,?)
      `,
        [
          req.body.email,
          req.body.name,
          req.body.companyname,
          req.body.role,
          req.body.descr,
        ]
      );
    } else {
      const [seekerresult] = await pool.query(
        `
      INSERT INTO JobSeeker (email, name, skills, descr)
      VALUES (?, ?, ?,?)
      `,
        [req.body.email, req.body.name, req.body.skills, req.body.descr]
      );
    }
    return res.json({
      sucess: "user added sucessfuly",
    });
  }
});

app.get("/user/login", async (req, res) => {
  const [user] = await pool.query(
    "SELECT * FROM Users WHERE email=?",
    req.body.email
  );
  if (user.length === 0) {
    throw new Error("User does't Exists");
  }
  if (bcrypt.compareSync(req.body.password, user[0].password)) {
    if (user[0].company) {
      const [compresult] = await pool.query(
        "SELECT * FROM Company WHERE email=?",
        req.body.email
      );
      const token = jwt.sign(compresult[0], process.env.JWT_PRIVATEKEY);
      return res.status(201).cookie("auth", token).json({ token });
    } else {
      const [seekerresult] = await pool.query(
        "SELECT * FROM JobSeeker WHERE email=?",
        req.body.email
      );
      const token = jwt.sign(seekerresult[0], process.env.JWT_PRIVATEKEY);
      return res.status(201).cookie("auth", token).json({ token });
    }
  } else {
    throw new Error("Incorrect password");
  }
});

app.get("/get", async (req, res) => {
  const id = req.query.id;
  const email = req.query.email;
  if (id) {
    const [job] = await pool.query("SELECT * FROM Job WHERE ID=?", id);
    return res.json(job);
  }
  if (email) {
    const [jobsby] = await pool.query("SELECT * FROM Job WHERE email=?", email);
    return res.json(jobsby);
  }
  const [jobs] = await pool.query("SELECT * FROM Job");
  return res.json(jobs);
});

app.post("/post", async (req, res) => {
  const [result] = await pool.query(
    `
  INSERT INTO Job (descr, exp, profile, techs, email)
  VALUES (?, ?, ?, ?, ?)
  `,
    [
      req.body.descr,
      req.body.exp,
      req.body.profile,
      req.body.techs,
      req.body.email,
    ]
  );
  console.log(result);
  return res.json({ sucess: `job added sucessfuly at id ${result.insertId}` });
});

app.put("/put", async (req, res) => {
  const jobid = req.query.id;
  const [result] = await pool.query(
    `
    UPDATE Job
    SET ? 
    WHERE ID = ?
  `,
    [req.body, jobid]
  );
  console.log(result);
  return res.json({
    sucess: `job at id ${jobid} sucessfuly updated`,
  });
});

app.delete("/delete", async (req, res) => {
  const jobid = req.query.id;
  const [result] = await pool.query(
    `
    DELETE FROM Job
    WHERE ID = ?
  `,
    jobid
  );
  console.log(result);
  return res.json({
    sucess: `job at id ${jobid} sucessfuly deleted`,
  });
});

app.get("/get/:q", async (req, res) => {
  const q = req.params.q;
  const [result] = await pool.query(
    `
SELECT *
FROM Job
WHERE descr LIKE '%${q}%'
  OR profile LIKE '%${q}%'
  OR techs LIKE '%${q}%'
ORDER BY ID ASC;
`
  );
  res.send(result);
});

app.post("/apply", async (req, res) => {
  const [result] = await pool.query(
    `
  INSERT INTO Apply ( jobID ,providerEmail ,seekerEmail)
  VALUES (?, ?, ?)
  `,
    [req.body.jobID, req.body.providerEmail, req.body.seekerEmail]
  );
  console.log(result);
  return res.json({ sucess: "Your Application is submited sucessfuly" });
});

app.listen(8080, (err) => {
  console.log("running on 8080");
});
