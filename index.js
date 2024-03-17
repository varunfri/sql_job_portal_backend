const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
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

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);

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
  try {
    const [user] = await pool.query(
      "SELECT * FROM Users WHERE email=?",
      req.body.email
    );
    if (user.length) {
      return res.status(401).json({ error: "User Exists with this email" });
    } else {
      const [result] = await pool.query(
        `
    INSERT INTO Users (email, password, company)
    VALUES (?, ?, ?)
    `,
        [
          req.body.email,
          bcrypt.hashSync(req.body.password, 10),
          req.body.company,
        ]
      );
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
        sucess: "user added sucessfully",
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.post("/user/login", async (req, res) => {
  try {
    const [user] = await pool.query(
      "SELECT * FROM Users WHERE email=?",
      req.body.email
    );
    if (user.length === 0) {
      return res.status(404).json({ error: "User does't Exists" });
    }
    if (bcrypt.compareSync(req.body.password, user[0].password)) {
      if (user[0].company) {
        const [compresult] = await pool.query(
          "SELECT * FROM Company WHERE email=?",
          req.body.email
        );
        const token = jwt.sign(compresult[0], process.env.JWT_PRIVATEKEY);
        return res.status(201).cookie("auth", token).json({ token });
        // return res.status(201).json(compresult[0]);
      } else {
        const [seekerresult] = await pool.query(
          "SELECT * FROM JobSeeker WHERE email=?",
          req.body.email
        );
        const token = jwt.sign(seekerresult[0], process.env.JWT_PRIVATEKEY);
        return res.status(201).cookie("auth", token).json({ token });
        // return res.status(201).json(seekerresult[0]);
      }
    } else {
      return res.status(401).json({ error: "Incorrect password" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.get("/get", async (req, res) => {
  const id = req.query.id;
  const email = req.query.email;
  try {
    if (id) {
      const [job] = await pool.query("SELECT * FROM Job WHERE ID=?", id);
      return res.json(job);
    }
    if (email) {
      const [jobsby] = await pool.query(
        "SELECT * FROM Job WHERE email=?",
        email
      );
      return res.json(jobsby);
    }
    const [jobs] = await pool.query("SELECT * FROM Job");
    return res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.post("/post", async (req, res) => {
  try {
    const [result] = await pool.query(
      `
  INSERT INTO Job (title, descr, exp, profile, techs, email)
  VALUES (?, ?, ?, ?, ?, ?)
  `,
      [
        req.body.title,
        req.body.descr,
        req.body.exp,
        req.body.profile,
        req.body.techs,
        req.body.email,
      ]
    );
    return res.json({
      sucess: `job added sucessfully at id ${result.insertId}`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.put("/put", async (req, res) => {
  const jobid = req.query.id;
  try {
    const [result] = await pool.query(
      `
    UPDATE Job
    SET ? 
    WHERE ID = ?
  `,
      [req.body, jobid]
    );
    return res.json({
      sucess: `job at id ${jobid} sucessfully updated`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.delete("/delete", async (req, res) => {
  const jobid = req.query.id;
  try {
    const [result1] = await pool.query(
      `
    DELETE FROM Apply
    WHERE jobID = ?
  `,
      jobid
    );
    const [result2] = await pool.query(
      `
    DELETE FROM Job
    WHERE ID = ?
  `,
      jobid
    );
    return res.json({
      sucess: `job at id ${jobid} sucessfully deleted`,
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.get("/get/:q", async (req, res) => {
  const q = req.params.q;
  try {
    const [result] = await pool.query(
      `
SELECT *
FROM Job
WHERE descr LIKE '%${q}%'
  OR title LIKE '%${q}%'
  OR profile LIKE '%${q}%'
  OR techs LIKE '%${q}%'
ORDER BY ID ASC;
`
    );
    res.send(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error: " + error.message });
  }
});

app.post("/apply", async (req, res) => {
  try {
    const [result] = await pool.query(
      `
  INSERT INTO Apply ( jobID ,providerEmail ,seekerEmail)
  VALUES (?, ?, ?)
  `,
      [req.body.jobID, req.body.providerEmail, req.body.seekerEmail]
    );
    return res.json({ sucess: "Your Application is submited sucessfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/getapplied", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }

  try {
    const [result] = await pool.query(
      `
      SELECT Job.title AS job_title, providerEmail
      FROM Apply
      JOIN Job ON Apply.jobID = Job.ID
      WHERE Apply.seekerEmail = ?
      `,
      email
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(8080, (err) => {
  console.log("running on 8080");
});
