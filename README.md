# zWave Device Tester

Minimalist WebInterface to test zWave devices connected to a zWave Controller.

## Requirements

[OpenZwave](https://github.com/OpenZWave/open-zwave) should be available on the system.

You can use the following script to install OZW

``` bash
git clone https://github.com/OpenZWave/open-zwave.git 
cd open-zwave
git checkout 5d18bbfb21d8cdc61ee6baae6f478c963297dfc5
sudo make
sudo make install
sudo sh -c "echo '/usr/local/lib64' > /etc/ld.so.conf.d/openzwave.conf"
sudo ldconfig
```

## Install dependencies

Run the following command:

```bash
npm ci
```