-- Table: User
CREATE TABLE Users (
    email VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    company BOOLEAN
);

-- Table: Company
CREATE TABLE Company (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    companyname VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    descr TEXT,
    FOREIGN KEY (email) REFERENCES Users(email)
);

-- Table: JobSeeker
CREATE TABLE JobSeeker (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    skills TEXT,
    descr TEXT,
    FOREIGN KEY (email) REFERENCES Users(email)
);

-- Table: Job
CREATE TABLE Job (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    descr TEXT,
    exp INT,
    profile VARCHAR(255),
    techs TEXT,
    email VARCHAR(255),
    FOREIGN KEY (email) REFERENCES Users(email)
);

-- Inserting data into Job table (signup company user with email comp@test)
INSERT INTO Job (descr, exp, profile, techs, email) VALUES 
('Software engineer who can work on enterprise projects using spring boot and mongodb and react', 1, 'Developer', 'java,spring,springbot,microservices', 'comp@test'),
('Associate consultant architecture of software, Agile, Devops', 10, 'Architect', 'java,spring,springbot,Azure,devops', 'comp@test');

-- Table: Apply
CREATE TABLE Apply (
    jobID INT,
    providerEmail VARCHAR(255),
    seekerEmail VARCHAR(255),
    FOREIGN KEY (jobID) REFERENCES Job(ID),
    FOREIGN KEY (providerEmail) REFERENCES Company(email),
    FOREIGN KEY (seekerEmail) REFERENCES JobSeeker(email)
);