CREATE TABLE Customers (
    Id BIGINT IDENTITY(1,1) PRIMARY KEY,
    NombreCompleto NVARCHAR(100) NOT NULL,
    DNI BIGINT NOT NULL,
    Estado VARCHAR(10) NOT NULL,
    FechaIngreso DATE NOT NULL,
    EsPEP BIT NOT NULL,
    EsSujetoObligado BIT NULL,
    FechaCreacion DATETIME NOT NULL
);