

http://www.reuk.co.uk/DS18B20-Temperature-Sensor-with-Raspberry-Pi.htm

Configure the 1-Wire interface
------------------------------

The tutorials suggest to enable the 1-wire interface from the terminal, but on the new Raspberry Pi use the Advanced options of raspi-config to enable 1-wire.

```bash
$ raspi-config 
```

Select option 9, "Advanced options" and then select "1-Wire" to enable the interface.

Load the drivers
----------------

(Please note, it seems the DS18B20 temperature sensor and 1-Wire interface works with the new Raspberry Pi 3 devices without loading the drivers. If not, performs the steps below.)

In order to probe the sensors, the temperature driver needs to be loaded. To load the drivers enter in the terminal before starting Streembit.

```bash
$ sudo modprobe w1-gpio && sudo modprobe w1-therm
```

Alternatively, create a shell script to load the driver by executing the above command when booting the device.

The device description follows the recommendations of the [WoT standardization initiative](https://www.w3.org/WoT/IG/). 

```json
{
    "@context": "http://schema.org/",
    "metadata": { "name": "Temperature Sensor"},
    "encodings": ["JSON"],
    "interactions": [
        {
            "@type": "Property",
            "name": "temperature",
            "outputData": "xsd:float",
            "writable": false
        },
        { 
            "@type": "Event",
            "outputData": "xsd:float",
            "name": "highTemperature"
        }
    ]
};
```





