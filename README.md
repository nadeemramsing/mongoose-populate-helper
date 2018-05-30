# mongoose-populate-helper
A mongoose plugin to facilitate population and sorting among others when referencing is used.

----------

## How to use
```ts
    articleSchema.plugin(mongoosePopulateHelper, configurations: Array<Object> || configuration: Object);

    configuration: {
        'sourceField': 
            '<Field that will be used in targetModel to set targetField>',

        'targetField': 
            '<New field added to schema>',

        'map': 
            "<Function to map sourceField's value before assigning to targetField>",

        'targetModel'?: 
            //default = schema using the plugin
            "<
            Model from which value is taken (for type = 'local') 
            or 
            Model to which value is assigned (for type = 'foreign')
            >"
    }

    //'referenceField' and 'targetModel' used => type = 'foreign'; ELSE, type = 'local'
```

### Type = 'local'
- Assignment is done in Schema using the plugin.

- Retrieval is done from targetModel.

E.g.:

![Alt text](img\mongoose-populate-helper-local.png)


### Type = 'foreign'
- Assignment is done in targetModel using **referenceField**.

- Retrieval is done from Schema using the plugin.

E.g.:

![Alt text](img\mongoose-populate-helper-foreign.png)

Example (local):

![Alt text](img\Code_2018-05-30_12-40-54.png)

Example (foreign):

![Alt text](img\Code_2018-05-30_12-38-37.png)
)

----------

## Result
![Alt text](img\chrome_2018-05-30_12-42-50.png)

----------

## Limitations

----------

## Notes
- Tested on MongoDB 3.2, Mongoose 4.5.9, NodeJS 8.11.1, NPM 5.6.0