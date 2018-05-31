const
    _ = require('lodash'),
    async = require('async'),
    ObjectId = require('mongoose/lib/types/objectid');

module.exports = function mongoosePopulateHelper(schema, configs) {
    if (configs.constructor.name === 'Object')
        configs = [configs];

    _.each(configs, function (config) {
        //default
        config.targetSchema = config.targetSchema ? config.targetSchema : schema;

        const type = getType(config);

        const newField = {
            [config.targetField.name]: _.omit(config.targetField, 'name')
        };

        addFieldToSchema({
            newField: newField,
            type: type,
            localSchema: schema,
            foreignSchema: config.targetSchema
        });

        schema.post('save', function (document, done) {
            async.waterfall([
                selectSourceField,
                populateSourceField,
                assignTargetField
            ], done);

            function selectSourceField(next) {
                if (!_.isNil(document[config.sourceField]))
                    return next(null, document);

                document.constructor
                    .findById(document.id)
                    .select(
                        [config.sourceField]
                            .concat(Object.keys(document.toObject()))
                            .join(' ')
                    )
                    .exec(next);
            }

            function populateSourceField(document, next) {
                if (document === null)
                    return done();

                if (!(document[config.sourceField] instanceof ObjectId))
                    return next(null, document);

                document.populate(config.sourceField, next)
            }

            function assignTargetField(document, next) {
                if (document[config.sourceField] === null)
                    return done();

                document[config.targetField.name] = config.map ? config.map(document[config.sourceField]) : document[config.sourceField];

                if (type === 'foreign')
                    document.populate(config.referenceField, (err, document) => err ? next(err) : updateDocument(document[config.referenceField]))
                else
                    updateDocument(document);

                /* LOCAL HELPER */
                function updateDocument(model) {
                    try {
                        model.collection
                            .update({ _id: model._id }, { $set: { [config.targetField.name]: document[config.targetField.name] } })
                            .then(() => next())
                            .catch(next);
                    }
                    catch (e) {
                        next();
                    }
                }
            }

        });
    });
}

/* GLOBAL HELPERS */
function getType(config) {
    if (['referenceField', 'targetSchema'].every(key => key in config))
        return 'foreign';

    return 'local';
}

function addFieldToSchema(options) {
    if (options.type === 'foreign')
        options.foreignSchema.add(options.newField);
    else
        options.localSchema.add(options.newField);
}