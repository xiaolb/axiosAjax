set -e
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g')
echo "Enter release version[$PACKAGE_VERSION]: "
read VERSION
read -p "Releasing $VERSION - are you sure? (y/n)" -n 1 -r
echo    # (optional) move to a new line
if [[ $REPLY =~ ^[Yy]$ ]]
then
  echo "Releasing $VERSION ..."
  check_status=$(git status |grep "git add")
  if [[ -n $check_status ]]
  then
    echo "Enter commit content: "
    read COMMENT
    # commit
    git add .
    git commit -m "[build] $COMMENT"
  fi
  if [$PACKAGE_VERSION != $VERSION ]
  then
    npm version $VERSION --message "[release] $VERSION"
  fi

  # publish
  git push origin refs/tags/v$VERSION
  git push
  cnpm publish
fi
