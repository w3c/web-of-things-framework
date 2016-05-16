# wot-pi
Raspberry Pi decentralized, peer-to-peer IoT implementation 

Setting up the system on the Raspberry Pi device
----------------------------------------------------------

Login to the Raspberry Pi device via terminal.   
Default user: **pi**, default password: **raspberry**

Change the password to your secure password

```bash
$ sudo passwd pi
```

Resize your disk if there is no space left on the SD disk. (Normally the disk has 0 space upon burning the Raspbian image. You must reboot after resizing!)

```bash
sudo raspi-config
```


Install Node.js.
---------------

Build Node.js from source.

```bash
$ cd /usr/local/src   
```

Use the latest Node.js version instead of 10.1 of this readme.

```bash
$ wget https://nodejs.org/dist/v5.10.1/node-v5.10.1.tar.gz
```

```bash
$ tar -xvzf node-v5.10.1.tar.gz
```

```bash
cd node-v5.10.1
```

```bash
$ ./configure
```

```bash
$ make install
```

```bash
$ which node
```

The Node installation diectory should be displayed.

```bash
$ node -v
```

The installation version should be 10.1.

Install Git:

```bash
$ sudo apt-get update
```

```bash
$ sudo apt-get install git
```

```bash
$ git clone https://github.com/streembit/streembit-pi.git
```

```bash
$ cd streembit-pi
```

Change the account details of the config.json file. Your device is identified by the account name, and therefore to make accessible your device 
you must create a unique account entity on the Streembit network. For example, if you want the device to be identifed as "myraspberrypi" then
put the "myraspberrypi" name at the node.account field.

```json
"node": {
        "account": "myraspberrypi",
        "address": "localhost",
        "port": 32321,
        "seeds": [
            { "address": "seed.streemio.org", "port": 32320, "public_key": "033b726f5ff2fc02a009ab2ef0844b807372af4b13d1236c2df9752de1ee93f5fa" },
            { "address": "seed.streemio.net", "port": 32320, "public_key": "033d92278f9440c8b4061dddf862f5e224d0ff312e642edfa2c93c86671442609f" },
            { "address": "seed.streemio.biz", "port": 32320, "public_key": "026f2303d7932ed86bf21b7150bcd45024f3926d37b615798855994b6b53e8b81b" },
            { "address": "seed.streemo.uk", "port": 32320, "public_key": "035f4881a0c7d50af6fcf7cc40c3eab60c382bf7f8cd83cd2a3ff5064afd893c70" }
        ]
    }
```

Define the device in the config.json file by adding an item to the "devices" array.  
For this tutorial the "device" field must be "ds18b20". (That is the file name in the device directory).
The id is to identify the device in the GUI-device interaction. It should be unique if there are multiple ds18b20 sensors connected to the Raspberry Pi device.    
If the "sample_interval" is defined then the device will start a timer and send the temperature value to the GUI. The timeout is defined in milliseconds.

```json
"devices": [
        {
            "device": "ds18b20",
            "id": "cb4ea824-208a-448d-9780-d748c6c96af7",
            "sample_interval": 5000
        }
    ]
```

Define the contacts. Only the contacts included in this list will be allowed to interact with the device. Enter the account name at the "name" field and the contact's public key to the "public_key" field.

```json
"contacts": [
        {
            "name": "your_no_1_contact",
            "public_key": "your_no_1_contact_public_key"
        },
        {
            "name": "your_no_2_contact",
            "public_key": "your_no_2_contact_public_key"
        }
    ]
```

Start the streembit application. You must define the private key password following the -pksecret in the command line to secure your PPKI private key. 
If the account does not exists then it will be created. Next time, you must use the same password to initialize the account.

```bash
$ cd node streembit.js -pksecret Password123456789
```

Open the Streembit GUI application, connect to the Strembit public network. Click on the "Machines/Connect to Internet of Things Device" menu item and enter device name defined in the node.account field to find the device.    
Once the device is located on the network you should see the temperature sampling from the DS18B20 sensor.   
You can send an event subscription request to the device by setting the temperature threshold. Once the temperature is higher than the threshold, then the GUI should receive a notification from the device.

---------

Please submit your questions/comments/suggestions at the [Streembit Forum](https://gitter.im/streembit).







