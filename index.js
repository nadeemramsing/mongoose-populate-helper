const
    _ = require('lodash'),
    async = require('async');

module.exports = function mongoosePopulateHelper(schema, configs) {
    if (configs.constructor.name === 'Object')
        configs = [configs];

    _.each(configs, function (config) {
        //default
        config.targetSchema = config.targetSchema || schema;

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
            let sourceFieldValue = get(config.sourceField),
                targetFieldValue = get(config.targetField.name);

            //document reference change detector
            let documentProxy = new Proxy({ document }, {
                set: (target, property, value) => {
                    document = value;
                    sourceFieldValue = get(config.sourceField);
                    targetFieldValue = get(config.targetField.name);
                    /* return true; */ //validates set
                }
            });

            async.waterfall([
                selectSourceField,
                populateSourceField,
                assignTargetField
            ], done);

            function selectSourceField(next) {
                if (!_.isNil(sourceFieldValue))
                    return next(null, document);

                document.constructor
                    .findById(document.id)
                    .select(
                        [config.sourceField]
                            .concat(Object.keys(document.toObject()))
                            .join(' ')
                    )
                    .exec(next);
                //Model.exec returns new instance of document => Not the same reference used
                //document.populate returns same instance of document
            }

            function populateSourceField(selectedDocument, next) {
                documentProxy.document = selectedDocument;

                if (document === null)
                    return done();

                if (sourceFieldValue && sourceFieldValue.constructor.name === 'ObjectID')
                    return document.populate(config.sourceField, next)

                return next(null, document);
            }

            function assignTargetField(document, next) {
                documentProxy.document = document;

                if (_.isNil(sourceFieldValue))
                    return done();

                targetFieldValue = config.map ? config.map(sourceFieldValue) : sourceFieldValue;

                if (type === 'foreign')
                    document.populate(config.referenceField, (err, document) => err ? next(err) : updateDocument(document[config.referenceField]))
                else
                    updateDocument(document);

                /* ASSIGNTARGETFIELD LOCAL HELPER */
                function updateDocument(model) {
                    try {
                        model.collection
                            .update({ _id: model._id }, { $set: { [config.targetField.name]: targetFieldValue } })
                            .then(() => next())
                            .catch(next);
                    }
                    catch (e) {
                        next();
                    }
                }
            }

            /* HOOK LOCAL HELPER */
            function get(path) {
                return _.get(document, path);
            }

            function set(path) {
                return _.set(document, path);
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